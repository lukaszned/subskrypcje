// =============================================================
// src/screens/SubscriptionListScreen.tsx
//
// Lista subskrypcji zasilona live data z backendu.
// =============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export const SubscriptionListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'cancelled'>('active');
  const [sortBy, setSortBy] = useState<'none' | 'price' | 'date'>('none');

  const { data: allSubscriptions = [], isLoading, isError, refetch } = useSubscriptions({
    search: searchQuery,
    sortBy: sortBy === 'price' ? 'amount' : sortBy === 'date' ? 'nextPaymentDate' : undefined,
    sortOrder: 'asc'
  });

  const cancelMutation = useCancelSubscription();
  const payMutation = usePaySubscription();

  const handleCancel = (id: string, name: string) => {
    Alert.alert(
      'Anulować subskrypcję?',
      `Czy na pewno chcesz anulować "${name}"?`,
      [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Tak, anuluj',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(id, {
              onSuccess: () => Alert.alert('Sukces', 'Subskrypcja została anulowana.'),
              onError: (error) => Alert.alert('Błąd', error.message),
            });
          },
        },
      ]
    );
  };

  const handlePay = (id: string, name: string) => {
    Alert.alert(
      'Opłacono?',
      `Oznaczyć "${name}" jako opłaconą?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Tak, opłacono',
          onPress: () => {
            payMutation.mutate(id, {
              onSuccess: () => Alert.alert('Sukces', 'Płatność została odnotowana.'),
              onError: (error) => Alert.alert('Błąd', error.message),
            });
          },
        },
      ]
    );
  };

  const filteredData = useMemo(() => {
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

  const renderEmptyState = () => {
    if (isError) {
      return (
        <View style={styles.emptyStateContainer}>
          <Frown size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Błąd ładowania</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => refetch()}>
            <Text style={styles.addButtonText}>Ponów</Text>
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
        {!searchQuery && activeTab === 'active' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddSubscription')}
          >
            <Text style={styles.addButtonText}>Dodaj nową</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Subscription }) => {
    return (
      <SubscriptionListItem
        item={{
          id: item.id,
          name: item.name,
          category: CATEGORY_LABELS[item.category] || item.category,
          amount: item.amount,
          currency: item.currency,
          nextPaymentDate: item.nextPaymentDate ? new Date(item.nextPaymentDate).toLocaleDateString('pl-PL') : '-',
          cycle: BILLING_CYCLE_LABELS[item.billingCycle] || item.billingCycle,
          status: item.status === 'canceled' ? 'cancelled' : 'active',
        }}
        onDelete={(id) => handleCancel(id, item.name)}
        onPause={(id) => handlePay(id, item.name)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#0F172A" /></TouchableOpacity>
          <View style={styles.searchContainer}>
            <Search size={20} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Szukaj..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[styles.sortButton, sortBy !== 'none' && { borderColor: '#6366F1' }]}
            onPress={toggleSort}
          >
            <ArrowUpDown size={20} color={sortBy !== 'none' ? '#6366F1' : '#475569'} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Aktywne</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'cancelled' && styles.tabButtonActive]}
            onPress={() => setActiveTab('cancelled')}
          >
            <Text style={[styles.tabText, activeTab === 'cancelled' && styles.tabTextActive]}>Anulowane</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={isLoading ? [] : filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredData.length === 0 && !isLoading ? styles.listEmptyContent : styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366F1" />}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  header: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, alignItems: 'center', gap: 12 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: '100%', fontSize: 16 },
  sortButton: { width: 48, height: 48, backgroundColor: '#FFFFFF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20, backgroundColor: '#F1F5F9' },
  tabButtonActive: { backgroundColor: '#0F172A' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  listEmptyContent: { flex: 1, justifyContent: 'center' },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  addButton: { backgroundColor: '#6366F1', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: 12 },
  addButtonText: { color: '#FFFFFF', fontWeight: '600' },
});

export default SubscriptionListScreen;
