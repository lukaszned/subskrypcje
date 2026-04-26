// =============================================================
// src/screens/SubscriptionListScreen.tsx
//
// Lista subskrypcji zasilona live data z backendu.
//
// ZMIANY vs MOCK:
//   - data pochodzi z useSubscriptions()
//   - handleCancel -> useCancelSubscription (soft cancel)
//   - handlePay -> usePaySubscription
//   - filtrowanie po statusie (active tab = pending/paid/overdue, cancelled tab = canceled)
//   - sort działa na ISO date (nextPaymentDate) zamiast polskich stringów
// =============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Search, ArrowUpDown, Frown, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';

// Hooki
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useCancelSubscription } from '../hooks/useCancelSubscription';
import { usePaySubscription } from '../hooks/usePaySubscription';

// Typy
import { Subscription, CATEGORY_LABELS, BILLING_CYCLE_LABELS } from '../types/api';

// Komponent item
import SubscriptionListItem from './SubscriptionListItem';

// ─────────────────────────────────────────────────────────────
// EKRAN
// ─────────────────────────────────────────────────────────────

export const SubscriptionListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'cancelled'>('active');
  const [sortBy, setSortBy] = useState<'none' | 'price' | 'date'>('none');

  // ── Live data ────────────────────────────────────────────────
  const { data: allSubscriptions = [], isLoading, isError, refetch } = useSubscriptions({
    search: searchQuery,
    sortBy: sortBy === 'price' ? 'amount' : sortBy === 'date' ? 'nextPaymentDate' : undefined,
    sortOrder: 'asc'
  });
  const cancelMutation = useCancelSubscription();
  const payMutation = usePaySubscription();

  // ── Akcje ────────────────────────────────────────────────────

  const handleCancel = (id: string, name: string) => {
    Alert.alert(
      'Anulować subskrypcję?',
      `Czy na pewno chcesz anulować "${name}"? Możesz ją przywrócić później.`,
      [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Tak, anuluj',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(id, {
              onError: (error) => {
                Alert.alert('Błąd', error.message || 'Nie udało się anulować subskrypcji.');
              },
            });
          },
        },
      ]
    );
  };

  const handlePay = (id: string, name: string) => {
    Alert.alert(
      'Oznaczyć jako opłacone?',
      `Oznaczyć "${name}" jako opłaconą?`,
      [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Tak',
          onPress: () => {
            paySubscription(id).then(() => {
              queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY() });
              // ... reszta logiki invalidacji jest w hooku, tu wywołujemy tylko alert
            }).catch((error) => {
               Alert.alert('Błąd', error.message || 'Nie udało się oznaczyć jako opłacone.');
            });
            // Poprawka: użyjmy jednak payMutation dla spójności
            payMutation.mutate(id, {
              onError: (error) => {
                Alert.alert('Błąd', error.message || 'Nie udało się oznaczyć jako opłacone.');
              },
            });
          },
        },
      ]
    );
  };

  // ── Filtrowanie i sortowanie ─────────────────────────────────

  const filteredData = useMemo(() => {
    // Filtrowanie po tabach (aktywne vs anulowane) wciąż robimy na froncie 
    // lub moglibyśmy dodać to do API, ale na razie status tabów jest prosty
    return allSubscriptions.filter(item => {
      const matchesTab = activeTab === 'active'
        ? item.status !== 'canceled'
        : item.status === 'canceled';

      return matchesTab;
    });
  }, [allSubscriptions, activeTab]);

  const toggleSort = () => {
    if (sortBy === 'none') setSortBy('price');
    else if (sortBy === 'price') setSortBy('date');
    else setSortBy('none');
  };

  // ── Empty / Error states ─────────────────────────────────────

  const renderEmptyState = () => {
    if (isError) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconCircle}>
            <Frown size={48} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Błąd ładowania</Text>
          <Text style={styles.emptySubtitle}>Sprawdź połączenie z internetem i spróbuj ponownie.</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => refetch()}>
            <Text style={styles.addButtonText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyIconCircle}>
          <Frown size={48} color="#94A3B8" />
        </View>
        <Text style={styles.emptyTitle}>
          {searchQuery ? 'Nic nie znaleziono' : 'Brak subskrypcji'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? 'Spróbuj wpisać inną nazwę lub wyczyść filtry wyszukiwania.'
            : 'Lista w tej zakładce jest pusta. Dodaj swoją pierwszą subskrypcję.'}
        </Text>
        {!searchQuery && activeTab === 'active' && (
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddSubscription')}
          >
            <Text style={styles.addButtonText}>Dodaj nową</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Render item — mapowanie Subscription -> SubscriptionListItem ──

  const renderItem = ({ item }: { item: Subscription }) => {
    const cycleLabel = BILLING_CYCLE_LABELS[item.billingCycle] ?? item.billingCycle;
    const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;

    const nextPaymentFormatted = item.nextPaymentDate
      ? new Date(item.nextPaymentDate).toLocaleDateString('pl-PL', {
          day: 'numeric', month: 'short', year: 'numeric'
        })
      : '-';

    return (
      <SubscriptionListItem
        item={{
          id: item.id,
          name: item.name,
          category: categoryLabel,
          amount: item.amount,
          currency: item.currency,
          nextPaymentDate: nextPaymentFormatted,
          cycle: cycleLabel,
          status: item.status === 'canceled' ? 'cancelled' : 'active',
        }}
        onDelete={(id) => handleCancel(id, item.name)}
        onPause={(id) => handlePay(id, item.name)}
      />
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Search size={20} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Szukaj subskrypcji..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            style={[styles.sortButton, sortBy !== 'none' && { borderColor: '#6366F1', backgroundColor: '#EEF2FF' }]}
            activeOpacity={0.7}
            onPress={toggleSort}
          >
            <ArrowUpDown size={20} color={sortBy !== 'none' ? '#6366F1' : '#475569'} />
            {sortBy !== 'none' && (
              <View style={styles.sortBadge}>
                <Text style={styles.sortBadgeText}>{sortBy === 'price' ? '$' : 'D'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              Aktywne
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'cancelled' && styles.tabButtonActive]}
            onPress={() => setActiveTab('cancelled')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'cancelled' && styles.tabTextActive]}>
              Anulowane
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista */}
        <FlatList
          data={isLoading ? [] : filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredData.length === 0 && !isLoading ? styles.listEmptyContent : styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
          renderItem={renderItem}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 12, alignItems: 'center', gap: 12,
  },
  backButton: { padding: 4 },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16,
    height: 48, borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: '100%', fontSize: 16, color: '#0F172A' },
  sortButton: {
    width: 48, height: 48, backgroundColor: '#FFFFFF', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20, backgroundColor: '#F1F5F9' },
  tabButtonActive: { backgroundColor: '#0F172A' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  listContent: { paddingBottom: 40 },
  listEmptyContent: { flex: 1, justifyContent: 'center' },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  addButton: {
    backgroundColor: '#6366F1', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sortBadge: {
    position: 'absolute', top: -5, right: -5, backgroundColor: '#6366F1',
    borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2, minWidth: 16, alignItems: 'center',
  },
  sortBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
});

export default SubscriptionListScreen;
