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
import { useTheme } from '../theme/ThemeContext';
import { formatShortDate } from '../utils/date';
import { goBackOrDashboard } from '../utils/navigation';
import { buildSavingsFromSubscriptions } from '../utils/subscriptionCalculations';
import { BrandLogo } from '../components/BrandLogo';

type Nav = NativeStackNavigationProp<AppStackParamList, 'SavingsDetails'>;

export function SavingsDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const { theme } = useTheme();
  const savingsQuery = useDashboardSavings(true);
  const subscriptionsQuery = useSubscriptions();

  const localSavings = useMemo(
    () => buildSavingsFromSubscriptions(subscriptionsQuery.data ?? [], 'PLN'),
    [subscriptionsQuery.data]
  );

  const hasLocalSavings = localSavings.items.length > 0;
  const remoteItemCurrencies = Array.from(new Set(
    (savingsQuery.data?.items ?? [])
      .map((item) => item.originalCurrency)
      .filter(Boolean)
  ));
  const remoteCurrency = remoteItemCurrencies.length === 1
    ? remoteItemCurrencies[0]
    : savingsQuery.data?.baseCurrency || 'PLN';
  const items = hasLocalSavings ? localSavings.items : savingsQuery.data?.items ?? [];
  const monthlySavings = hasLocalSavings
    ? localSavings.monthlySavings
    : Number(savingsQuery.data?.monthlySavings || 0);
  const yearlySavings = hasLocalSavings
    ? localSavings.yearlySavings
    : Number(savingsQuery.data?.yearlySavings || 0);
  const canceledCount = hasLocalSavings
    ? localSavings.canceledSubscriptionsCount
    : Number(savingsQuery.data?.canceledSubscriptionsCount || 0);
  const currency = hasLocalSavings ? localSavings.baseCurrency : remoteCurrency;
  const isLive = Boolean(savingsQuery.data) && !hasLocalSavings;
  const isRefreshing = savingsQuery.isRefetching || subscriptionsQuery.isRefetching;

  const onRefresh = () => {
    savingsQuery.refetch();
    subscriptionsQuery.refetch();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.glowOne, { backgroundColor: `${theme.colors.primary}26` }]} />
      <View style={[styles.glowTwo, { backgroundColor: `${theme.colors.cyan}20` }]} />
      <View style={styles.header}>
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => goBackOrDashboard(navigation)} accessibilityLabel="Wstecz">
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Oszczędności</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Efekt anulowanych subskrypcji</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <LinearGradient colors={theme.gradients.primary} style={[styles.hero, { shadowColor: theme.colors.primary }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <PiggyBank size={27} color={theme.colors.darkText} />
            </View>
            <View style={styles.sourcePill}>
              {savingsQuery.isLoading ? <ActivityIndicator size="small" color={theme.colors.darkText} /> : null}
              <Text style={[styles.sourcePillText, { color: theme.colors.darkText }]}>{isLive ? 'Live savings' : 'Lokalny szacunek'}</Text>
            </View>
          </View>
          <Text style={[styles.heroLabel, { color: theme.colors.darkText }]}>Szacowana oszczędność</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.amount, { color: theme.colors.darkText }]}>{monthlySavings.toFixed(2)}</Text>
            <Text style={[styles.currency, { color: theme.colors.darkText }]}>{currency} / mc</Text>
          </View>
          <Text style={[styles.heroDesc, { color: theme.colors.darkText }]}>
            To miesięczny efekt usług oznaczonych jako anulowane. Rocznie daje to około {yearlySavings.toFixed(2)} {currency}.
          </Text>
        </LinearGradient>

        <View style={styles.grid}>
          <View style={[styles.metricCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TrendingDown size={19} color={theme.colors.primary} />
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{yearlySavings.toFixed(0)} {currency}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>rocznie mniej</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <CalendarCheck2 size={19} color={theme.colors.cyan} />
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{canceledCount}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>anulowane usługi</Text>
          </View>
        </View>

        <View style={[styles.explainCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Sparkles size={19} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Jak to liczymy?</Text>
          </View>
          <Text style={[styles.bodyText, { color: theme.colors.textMuted }]}>
            Bierzemy Twój zapisany koszt anulowanej subskrypcji i przeliczamy go na miesięczny odpowiednik.
            Przy planie współdzielonym kwota jest już Twoją częścią. Plan roczny dzielimy przez 12, a jednorazowe płatności pomijamy.
          </Text>
        </View>

        <View style={[styles.explainCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <ReceiptText size={19} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Anulowane aplikacje</Text>
          </View>

          {items.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: theme.colors.border }]}>
              <Text style={styles.emptyTitle}>Jeszcze brak zapisanych oszczędności</Text>
              <Text style={styles.emptyText}>Gdy anulujesz subskrypcję, pokażemy tutaj jej wpływ na miesięczny budżet.</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={[styles.savingRow, { borderTopColor: theme.colors.border }]}>
                <BrandLogo
                  name={item.name}
                  provider={item.provider}
                  size={42}
                  iconSize={25}
                  fallbackColor={theme.colors.primary}
                  containerStyle={[styles.brandBadge, { borderColor: `${theme.colors.primary}33` }]}
                  fallbackTextStyle={[styles.brandLetter, { color: theme.colors.primary }]}
                />
                <View style={styles.savingCopy}>
                  <Text style={[styles.savingName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.savingMeta, { color: theme.colors.textMuted }]}>
                    Anulowano {formatShortDate(item.canceledAt)} · wcześniej {Number(item.originalAmount || 0).toFixed(2)} {item.originalCurrency}
                  </Text>
                </View>
                <View style={styles.savingAmountBox}>
                  <Text style={[styles.savingAmount, { color: theme.colors.primary }]}>{Number(item.monthlyAmount || 0).toFixed(2)}</Text>
                  <Text style={[styles.savingAmountMeta, { color: theme.colors.textMuted }]}>{item.originalCurrency || 'PLN'}/mc</Text>
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
  glowOne: { position: 'absolute', top: -130, right: -130, width: 310, height: 310, borderRadius: 155, backgroundColor: 'rgba(255,255,255,0.15)' },
  glowTwo: { position: 'absolute', bottom: 80, left: -130, width: 270, height: 270, borderRadius: 135, backgroundColor: 'rgba(34,211,238,0.13)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  iconButton: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: vibrantTheme.colors.card, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  headerCopy: { flex: 1 },
  title: { color: vibrantTheme.colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 0 },
  subtitle: { color: vibrantTheme.colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 3 },
  content: { padding: 20, paddingBottom: 42 },
  hero: { borderRadius: 12, padding: 22, marginBottom: 16, ...vibrantTheme.shadows.glow },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  heroIcon: { width: 50, height: 50, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  sourcePill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.26)', paddingHorizontal: 12, paddingVertical: 8 },
  sourcePillText: { color: '#07111C', fontWeight: '900', fontSize: 12 },
  heroLabel: { color: 'rgba(7,17,28,0.72)', fontSize: 13, fontWeight: '900' },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  amount: { color: '#07111C', fontSize: 54, fontWeight: '900', lineHeight: 60, letterSpacing: 0 },
  currency: { color: 'rgba(7,17,28,0.78)', fontSize: 17, fontWeight: '900', marginBottom: 8, marginLeft: 6 },
  heroDesc: { color: 'rgba(7,17,28,0.78)', fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: 12 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  metricCard: { flex: 1, minHeight: 112, borderRadius: 12, padding: 16, backgroundColor: vibrantTheme.colors.card, borderWidth: 1, borderColor: vibrantTheme.colors.border, justifyContent: 'space-between' },
  metricValue: { color: vibrantTheme.colors.text, fontSize: 21, fontWeight: '900', letterSpacing: 0 },
  metricLabel: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '800' },
  explainCard: { backgroundColor: vibrantTheme.colors.card, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: vibrantTheme.colors.border, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { color: vibrantTheme.colors.text, fontSize: 16, fontWeight: '900' },
  bodyText: { color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  emptyBox: { borderRadius: 12, padding: 16, backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  emptyTitle: { color: vibrantTheme.colors.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptyText: { color: vibrantTheme.colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: vibrantTheme.colors.border },
  brandBadge: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  brandLetter: { color: '#CBD5E1', fontSize: 18, fontWeight: '900' },
  savingCopy: { flex: 1 },
  savingName: { color: vibrantTheme.colors.text, fontSize: 14, fontWeight: '900' },
  savingMeta: { color: vibrantTheme.colors.textMuted, fontSize: 11, lineHeight: 16, fontWeight: '600', marginTop: 2 },
  savingAmountBox: { alignItems: 'flex-end' },
  savingAmount: { color: '#CBD5E1', fontSize: 15, fontWeight: '900' },
  savingAmountMeta: { color: vibrantTheme.colors.textMuted, fontSize: 10, fontWeight: '800' },
});

export default SavingsDetailsScreen;
