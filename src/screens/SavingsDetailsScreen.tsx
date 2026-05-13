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
import { ArrowLeft, CalendarCheck2, PiggyBank, ReceiptText, Sparkles, TrendingDown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { useDashboardSavings } from '../hooks/useDashboardSavings';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { vibrantTheme } from '../theme/vibrantTheme';
import { formatShortDate } from '../utils/date';
import type { BillingCycle, SavingsItem, Subscription } from '../types/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'SavingsDetails'>;

function toMonthlyAmount(amount: number, billingCycle: BillingCycle) {
  switch (billingCycle) {
    case 'yearly':
      return amount / 12;
    case 'weekly':
      return amount * 4.345;
    case 'one_time':
      return 0;
    default:
      return amount;
  }
}

function buildLocalSavings(subscriptions: Subscription[]): SavingsItem[] {
  return subscriptions
    .filter((item) => item.status === 'canceled')
    .map((item) => {
      const monthlyAmount = toMonthlyAmount(Number(item.amount || 0), item.billingCycle);

      return {
        id: item.id,
        name: item.name,
        provider: item.provider,
        originalAmount: Number(item.amount || 0),
        originalCurrency: item.currency || 'PLN',
        monthlyAmount,
        yearlyAmount: monthlyAmount * 12,
        canceledAt: item.updatedAt || item.createdAt,
      };
    })
    .sort((a, b) => new Date(b.canceledAt).getTime() - new Date(a.canceledAt).getTime());
}

export function SavingsDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const savingsQuery = useDashboardSavings(true);
  const subscriptionsQuery = useSubscriptions();

  const localItems = useMemo(
    () => buildLocalSavings(subscriptionsQuery.data ?? []),
    [subscriptionsQuery.data]
  );

  const items = savingsQuery.data?.items?.length ? savingsQuery.data.items : localItems;
  const currency = savingsQuery.data?.baseCurrency || items[0]?.originalCurrency || 'PLN';
  const monthlySavings = savingsQuery.data?.monthlySavings ?? items.reduce((sum, item) => sum + Number(item.monthlyAmount || 0), 0);
  const yearlySavings = savingsQuery.data?.yearlySavings ?? monthlySavings * 12;
  const canceledCount = savingsQuery.data?.canceledSubscriptionsCount ?? items.length;
  const isLive = Boolean(savingsQuery.data);
  const isRefreshing = savingsQuery.isRefetching || subscriptionsQuery.isRefetching;

  const onRefresh = () => {
    savingsQuery.refetch();
    subscriptionsQuery.refetch();
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
          <Text style={styles.title}>Oszczędności</Text>
          <Text style={styles.subtitle}>Efekt anulowanych subskrypcji</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={vibrantTheme.colors.primary} />}
      >
        <LinearGradient colors={vibrantTheme.gradients.primary} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <PiggyBank size={27} color="#07111C" />
            </View>
            <View style={styles.sourcePill}>
              {savingsQuery.isLoading ? <ActivityIndicator size="small" color="#07111C" /> : null}
              <Text style={styles.sourcePillText}>{isLive ? 'Live savings' : 'Lokalny szacunek'}</Text>
            </View>
          </View>
          <Text style={styles.heroLabel}>Szacowana oszczędność</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{monthlySavings.toFixed(2)}</Text>
            <Text style={styles.currency}>{currency} / mc</Text>
          </View>
          <Text style={styles.heroDesc}>
            To miesięczny efekt usług oznaczonych jako anulowane. Rocznie daje to około {yearlySavings.toFixed(2)} {currency}.
          </Text>
        </LinearGradient>

        <View style={styles.grid}>
          <View style={styles.metricCard}>
            <TrendingDown size={19} color={vibrantTheme.colors.primary} />
            <Text style={styles.metricValue}>{yearlySavings.toFixed(0)} {currency}</Text>
            <Text style={styles.metricLabel}>rocznie mniej</Text>
          </View>
          <View style={styles.metricCard}>
            <CalendarCheck2 size={19} color={vibrantTheme.colors.cyan} />
            <Text style={styles.metricValue}>{canceledCount}</Text>
            <Text style={styles.metricLabel}>anulowane usługi</Text>
          </View>
        </View>

        <View style={styles.explainCard}>
          <View style={styles.cardHeader}>
            <Sparkles size={19} color={vibrantTheme.colors.primary} />
            <Text style={styles.cardTitle}>Jak to liczymy?</Text>
          </View>
          <Text style={styles.bodyText}>
            Bierzemy subskrypcje ze statusem anulowana i przeliczamy ich koszt na miesięczny odpowiednik.
            Plan roczny dzielimy przez 12, tygodniowy mnożymy przez 4.345, a jednorazowe płatności pomijamy.
          </Text>
        </View>

        <View style={styles.explainCard}>
          <View style={styles.cardHeader}>
            <ReceiptText size={19} color={vibrantTheme.colors.primary} />
            <Text style={styles.cardTitle}>Anulowane aplikacje</Text>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Jeszcze brak zapisanych oszczędności</Text>
              <Text style={styles.emptyText}>Gdy anulujesz subskrypcję, pokażemy tutaj jej wpływ na miesięczny budżet.</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.savingRow}>
                <View style={styles.brandBadge}>
                  <Text style={styles.brandLetter}>{(item.provider || item.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.savingCopy}>
                  <Text style={styles.savingName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.savingMeta}>
                    Anulowano {formatShortDate(item.canceledAt)} · wcześniej {Number(item.originalAmount || 0).toFixed(2)} {item.originalCurrency}
                  </Text>
                </View>
                <View style={styles.savingAmountBox}>
                  <Text style={styles.savingAmount}>{Number(item.monthlyAmount || 0).toFixed(2)}</Text>
                  <Text style={styles.savingAmountMeta}>{currency}/mc</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  glowOne: { position: 'absolute', top: -130, right: -130, width: 310, height: 310, borderRadius: 155, backgroundColor: 'rgba(32,246,181,0.15)' },
  glowTwo: { position: 'absolute', bottom: 80, left: -130, width: 270, height: 270, borderRadius: 135, backgroundColor: 'rgba(34,211,238,0.13)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  iconButton: { width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: vibrantTheme.colors.card, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  headerCopy: { flex: 1 },
  title: { color: vibrantTheme.colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 0 },
  subtitle: { color: vibrantTheme.colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 3 },
  content: { padding: 20, paddingBottom: 42 },
  hero: { borderRadius: 30, padding: 22, marginBottom: 16, ...vibrantTheme.shadows.glow },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  heroIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  sourcePill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.26)', paddingHorizontal: 12, paddingVertical: 8 },
  sourcePillText: { color: '#07111C', fontWeight: '900', fontSize: 12 },
  heroLabel: { color: 'rgba(7,17,28,0.72)', fontSize: 13, fontWeight: '900' },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  amount: { color: '#07111C', fontSize: 54, fontWeight: '900', lineHeight: 60, letterSpacing: 0 },
  currency: { color: 'rgba(7,17,28,0.78)', fontSize: 17, fontWeight: '900', marginBottom: 8, marginLeft: 6 },
  heroDesc: { color: 'rgba(7,17,28,0.78)', fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: 12 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  metricCard: { flex: 1, minHeight: 112, borderRadius: 24, padding: 16, backgroundColor: vibrantTheme.colors.card, borderWidth: 1, borderColor: vibrantTheme.colors.border, justifyContent: 'space-between' },
  metricValue: { color: vibrantTheme.colors.text, fontSize: 21, fontWeight: '900', letterSpacing: 0 },
  metricLabel: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '800' },
  explainCard: { backgroundColor: vibrantTheme.colors.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: vibrantTheme.colors.border, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { color: vibrantTheme.colors.text, fontSize: 16, fontWeight: '900' },
  bodyText: { color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  emptyBox: { borderRadius: 20, padding: 16, backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  emptyTitle: { color: vibrantTheme.colors.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptyText: { color: vibrantTheme.colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: vibrantTheme.colors.border },
  brandBadge: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(32,246,181,0.16)', borderWidth: 1, borderColor: 'rgba(32,246,181,0.24)' },
  brandLetter: { color: vibrantTheme.colors.primary, fontSize: 18, fontWeight: '900' },
  savingCopy: { flex: 1 },
  savingName: { color: vibrantTheme.colors.text, fontSize: 14, fontWeight: '900' },
  savingMeta: { color: vibrantTheme.colors.textMuted, fontSize: 11, lineHeight: 16, fontWeight: '600', marginTop: 2 },
  savingAmountBox: { alignItems: 'flex-end' },
  savingAmount: { color: vibrantTheme.colors.success, fontSize: 15, fontWeight: '900' },
  savingAmountMeta: { color: vibrantTheme.colors.textMuted, fontSize: 10, fontWeight: '800' },
});

export default SavingsDetailsScreen;
