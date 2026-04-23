import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { Plus, TrendingUp, ArrowRight, Activity } from 'lucide-react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { DonutChart } from '../components/DonutChart';

// --- TYPY ---
export interface Subscription {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  nextPaymentDate: string; // ISO
}

export interface UpcomingPayment {
  id: string;
  subscriptionId: string;
  name: string;
  amount: number;
  currency: string;
  daysLeft: number;
  dateLabel: string;
}

// --- MOCK DANE ---

const MOCK_UPCOMING: UpcomingPayment[] = [
  { id: 'u1', subscriptionId: '2', name: 'Spotify', amount: 19.99, currency: 'PLN', daysLeft: 1, dateLabel: 'Jutro' },
  { id: 'u2', subscriptionId: '4', name: 'Gym', amount: 120.00, currency: 'PLN', daysLeft: 6, dateLabel: '29 Kwietnia' },
  { id: 'u3', subscriptionId: '3', name: 'Adobe CC', amount: 249.00, currency: 'PLN', daysLeft: 8, dateLabel: '1 Maja' },
];

// --- KOMPONENTY ---

const Skeleton = ({ width, height, style, borderRadius = 8 }: any) => {
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
};


export const DashboardScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  const theme = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textDim: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    iconBg: isDark ? '#334155' : '#EEF2FF',
    iconWarningBg: isDark ? '#78350F' : '#FEF3C7',
    iconWarningText: isDark ? '#FBBF24' : '#D97706',
    cardWarningBg: isDark ? '#451A03' : '#FFFBEB',
    cardWarningBorder: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.4)',
    redBg: isDark ? '#450A0A' : '#FEF2F2',
    redText: isDark ? '#FCA5A5' : '#EF4444',
  };

  const dynamicStyles = getStyles(theme);
  const { subscriptions } = useSubscriptionStore();

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalCost = activeSubscriptions.reduce((acc, curr) => acc + (curr.amount / (curr.splitWith || 1)), 0);

  // Generowanie danych do wykresu
  const categoryColors: Record<string, string> = {
    'Rozrywka': '#6366F1', // indigo
    'Muzyka': '#EAB308',   // yellow
    'Zdrowie': '#22C55E',  // green
    'Narzędzia': '#3B82F6',// blue
    'Auto / OC': '#BE185D',// pink
    'Inne': '#64748B',     // slate
  };

  const chartData = activeSubscriptions.reduce((acc: any[], curr) => {
    const cost = curr.amount / (curr.splitWith || 1);
    const existing = acc.find(c => c.category === curr.category);
    if (existing) {
      existing.value += cost;
    } else {
      acc.push({
        category: curr.category,
        value: cost,
        color: categoryColors[curr.category] || categoryColors['Inne']
      });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value); // od największego

  const renderAnalyticsPlaceholder = () => (
    <View style={[dynamicStyles.analyticsCard, dynamicStyles.shadowSm]}>
      <View style={dynamicStyles.analyticsHeader}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={dynamicStyles.sectionTitle}>Wydatki wg Kategorii</Text>
          <TouchableOpacity onPress={() => navigation.navigate('NotificationsTest')} style={{ marginLeft: 8 }}>
            <Activity size={20} color={theme.textDim} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
        <DonutChart data={chartData} radius={50} strokeWidth={16} />
        
        <View style={{ flex: 1, marginLeft: 24, gap: 8 }}>
          {chartData.length === 0 ? (
            <Text style={{ color: theme.textDim, fontSize: 13 }}>Brak aktywnych wydatków</Text>
          ) : (
            chartData.slice(0, 4).map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: theme.text, fontWeight: '500' }} numberOfLines={1}>{item.category}</Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.text, fontWeight: '700' }}>{Math.round((item.value / totalCost) * 100)}%</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );



  useEffect(() => {
    // Symulacja ładowania danych z API
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const renderHeader = () => (
    <View style={[dynamicStyles.headerCard, dynamicStyles.shadow]}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={dynamicStyles.headerSubtitle}>Całkowity koszt miesięczny</Text>
        <TouchableOpacity onPress={() => setIsDark(!isDark)}>
          {isDark ? <Sun size={20} color={theme.textDim} /> : <Moon size={20} color={theme.textDim} />}
        </TouchableOpacity>
      </View>
      <View style={dynamicStyles.headerAmountRow}>
        <Text style={dynamicStyles.headerAmount}>{totalCost.toFixed(2)}</Text>
        <Text style={dynamicStyles.headerCurrency}>PLN</Text>
      </View>
      <View style={dynamicStyles.headerChangeContainer}>
        <View style={dynamicStyles.changeBadgeRed}>
          <TrendingUp size={14} color="#EF4444" style={{ marginRight: 4 }} />
          <Text style={dynamicStyles.changeTextRed}>+12 PLN względem zeszłego mies.</Text>
        </View>
      </View>
    </View>
  );

  const renderUpcomingPayment = ({ item }: { item: UpcomingPayment }) => {
    const isTomorrow = item.daysLeft === 1;
    return (
      <View style={[dynamicStyles.upcomingCard, isTomorrow && dynamicStyles.upcomingCardWarning, dynamicStyles.shadowSm]}>
        <View style={dynamicStyles.upcomingTop}>
          <View style={[dynamicStyles.upcomingIconPlaceholder, isTomorrow && dynamicStyles.upcomingIconPlaceholderWarning]}>
            <Text style={[dynamicStyles.upcomingIconText, isTomorrow && dynamicStyles.upcomingIconTextWarning]}>{item.name.charAt(0)}</Text>
          </View>
          <Text style={[dynamicStyles.upcomingDate, isTomorrow && dynamicStyles.upcomingDateWarning]} numberOfLines={1}>{item.dateLabel}</Text>
        </View>
        <Text style={dynamicStyles.upcomingName} numberOfLines={1}>{item.name}</Text>
        <Text style={dynamicStyles.upcomingAmount}>{item.amount.toFixed(2)} {item.currency}</Text>
      </View>
    );
  };

  const renderSubscriptionRow = ({ item }: { item: Subscription }) => (
    <View style={dynamicStyles.subscriptionRow}>
      <View style={dynamicStyles.subscriptionLogo}>
        <Text style={dynamicStyles.subscriptionInitial}>{item.name.charAt(0)}</Text>
      </View>
      <View style={dynamicStyles.subscriptionInfo}>
        <Text style={dynamicStyles.subscriptionName} numberOfLines={1}>{item.name}</Text>
        <View style={dynamicStyles.categoryTag}>
          <Text style={dynamicStyles.categoryTagText}>{item.category}</Text>
        </View>
      </View>
      <View style={dynamicStyles.subscriptionPriceContainer}>
        <Text style={dynamicStyles.subscriptionPrice}>{item.amount.toFixed(2)} PLN</Text>
      </View>
    </View>
  );


  if (isLoading) {
    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <ScrollView style={dynamicStyles.container} contentContainerStyle={dynamicStyles.scrollContent}>
          {/* Skeleton Header */}
          <Skeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: 24, marginTop: 8 }} />

          <Skeleton width={180} height={24} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', marginBottom: 32 }}>
            <Skeleton width={140} height={110} borderRadius={16} style={{ marginRight: 16 }} />
            <Skeleton width={140} height={110} borderRadius={16} style={{ marginRight: 16 }} />
            <Skeleton width={140} height={110} borderRadius={16} />
          </View>

          <Skeleton width={150} height={24} style={{ marginBottom: 16 }} />
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }} >
              <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Skeleton width={120} height={16} style={{ marginBottom: 8 }} />
                <Skeleton width={80} height={12} />
              </View>
              <Skeleton width={70} height={20} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView style={dynamicStyles.container} contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header Hero Section */}
        {renderHeader()}

        {/* Nadchodzące Płatności */}
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
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={MOCK_UPCOMING}
            keyExtractor={(item) => item.id}
            renderItem={renderUpcomingPayment}
            contentContainerStyle={dynamicStyles.horizontalListPadding}
            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
          />
        </View>

        {/* Analityka Mini Chart */}
        <View style={dynamicStyles.sectionContainer}>
          {renderAnalyticsPlaceholder()}
        </View>

        {/* Lista Subskrypcji */}
        <View style={[dynamicStyles.sectionContainer, dynamicStyles.lastSection]}>
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>Twoje Subskrypcje</Text>
          </View>
          {activeSubscriptions.slice(0, 4).map((item: any) => (
            <React.Fragment key={item.id}>
              {renderSubscriptionRow({ item })}
            </React.Fragment>
          ))}
        </View>

      </ScrollView>

      {/* Quick Action Button (FAB) */}
      <TouchableOpacity 
        style={[dynamicStyles.fab, dynamicStyles.shadowLg]} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddSubscription')}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg, // Bardzo jasny szary/niebieskawy - nowoczesny styl
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Miejsce na FAB
  },
  // --- CIENIE ---
  shadow: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  shadowSm: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowLg: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  // --- HEADER ---
  headerCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textDim,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  headerAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -1,
  },
  headerCurrency: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.textDim,
    marginLeft: 8,
  },
  headerChangeContainer: {
    flexDirection: 'row',
  },
  changeBadgeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.redBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeTextRed: {
    color: theme.redText,
    fontSize: 12,
    fontWeight: '600',
  },
  // --- SEKCJE ---
  sectionContainer: {
    marginBottom: 32,
  },
  lastSection: {
    marginBottom: 20,
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
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginRight: 4,
  },
  // --- UPCOMING PAYMENTS ---
  horizontalListPadding: {
    paddingVertical: 4,
    paddingHorizontal: 4, // Dla cieni
  },
  upcomingCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    width: 140,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  upcomingCardWarning: {
    borderColor: theme.cardWarningBorder,
    backgroundColor: theme.cardWarningBg, // Bardzo delikatny żółty/pomarańczowy odcień
  },
  upcomingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  upcomingIconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.iconBg, // indygo-50
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingIconPlaceholderWarning: {
    backgroundColor: theme.iconWarningBg, // amber-100
  },
  upcomingIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  upcomingIconTextWarning: {
    color: theme.iconWarningText, // amber-600
  },
  upcomingDate: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textDim,
    marginTop: 4,
  },
  upcomingDateWarning: {
    color: theme.iconWarningText,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  upcomingAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
  },
  // --- ANALITYKA ---
  analyticsCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  analyticsSubtitle: {
    fontSize: 13,
    color: theme.textDim,
    marginBottom: 20,
  },
  chartContainer: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  chartBarWrapper: {
    width: 30,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: 12,
    backgroundColor: theme.border, // slate-100
    borderRadius: 6,
  },
  chartBarActive: {
    backgroundColor: '#6366F1',
  },
  // --- SUBSKRYPCJE ---
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  subscriptionLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  subscriptionInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
  },
  subscriptionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: theme.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.textDim,
    textTransform: 'uppercase',
  },
  subscriptionPriceContainer: {
    alignItems: 'flex-end',
  },
  subscriptionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  // --- FAB ---
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DashboardScreen;
