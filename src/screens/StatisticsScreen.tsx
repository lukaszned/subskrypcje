import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BarChart3, TrendingUp, Wallet } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useDashboardTrends } from '../hooks/useDashboardTrends';
import { useBudgetImpact } from '../hooks/useBudgetImpact';

export const StatisticsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Statistics'>>();
  const { data: summary } = useDashboardSummary();
  const { data: trends } = useDashboardTrends(6, 'planned');
  const { data: budget } = useBudgetImpact();

  const maxAmount = Math.max(...(trends?.items ?? []).map((item) => item.amount), 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color="#14251B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statystyki</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
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
            <TrendingUp size={20} color="#0B6B3A" />
          </View>
          <View style={styles.chart}>
            {(trends?.items ?? []).map((item) => (
              <View key={item.month} style={styles.chartColumn}>
                <View style={[styles.chartBar, { height: `${Math.max(12, (item.amount / maxAmount) * 100)}%` }]} />
                <Text style={styles.chartLabel}>{item.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {budget?.hasIncome && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Wpływ na budżet</Text>
              <Wallet size={20} color="#0B6B3A" />
            </View>
            <Text style={styles.metricValue}>{budget.subscriptionsIncomePercentage ?? 0}%</Text>
            <Text style={styles.metricHint}>
              Taki udział miesięcznego dochodu zajmują aktualne subskrypcje.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8F4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#14251B' },
  content: { padding: 20, paddingBottom: 48 },
  heroCard: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: '#0B6B3A',
    marginBottom: 18,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroLabel: { color: '#BFEAD2', fontSize: 13, fontWeight: '700' },
  heroValue: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', marginTop: 6 },
  heroHint: { color: '#D8F5E5', fontSize: 13, lineHeight: 19, marginTop: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1C3025',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  cardTitle: { color: '#14251B', fontSize: 16, fontWeight: '800' },
  chart: { height: 160, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  chartColumn: { flex: 1, alignItems: 'center', height: '100%' },
  chartBar: { width: '100%', borderRadius: 8, backgroundColor: '#0B6B3A' },
  chartLabel: { color: '#66756A', fontSize: 10, fontWeight: '700', marginTop: 8 },
  metricValue: { color: '#0B6B3A', fontSize: 34, fontWeight: '900' },
  metricHint: { color: '#66756A', fontSize: 13, lineHeight: 19, marginTop: 8 },
});

export default StatisticsScreen;
