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
} from 'react-native';
import { Search, ArrowUpDown, Frown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import SubscriptionListItem, { SubscriptionItem } from './SubscriptionListItem';

const INITIAL_DATA: SubscriptionItem[] = [
  { id: '1', name: 'Netflix', category: 'Rozrywka', amount: 43.00, currency: 'PLN', nextPaymentDate: '12 Maj 2026', cycle: 'Miesięcznie', status: 'active' },
  { id: '2', name: 'Spotify', category: 'Muzyka', amount: 19.99, currency: 'PLN', nextPaymentDate: '24 Kwi 2026', cycle: 'Miesięcznie', status: 'active' },
  { id: '3', name: 'Adobe CC', category: 'Narzędzia', amount: 249.00, currency: 'PLN', nextPaymentDate: '1 Maj 2026', cycle: 'Miesięcznie', status: 'active' },
  { id: '4', name: 'Gym', category: 'Zdrowie', amount: 120.00, currency: 'PLN', nextPaymentDate: '29 Kwi 2026', cycle: 'Miesięcznie', status: 'active' },
  { id: '5', name: 'Vercel Pro', category: 'Narzędzia', amount: 80.00, currency: 'PLN', nextPaymentDate: '10 Maj 2026', cycle: 'Miesięcznie', status: 'active' },
  { id: '6', name: 'Amazon Prime', category: 'Rozrywka', amount: 49.00, currency: 'PLN', nextPaymentDate: '-', cycle: 'Rocznie', status: 'cancelled' },
];

export const SubscriptionListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [data, setData] = useState<SubscriptionItem[]>(INITIAL_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'cancelled'>('active');

  const handleDelete = (id: string) => {
    // Symulacja usuwania wiersza (usuwamy ze stanu lokalnego)
    setData(prev => prev.filter(item => item.id !== id));
  };

  const handlePause = (id: string) => {
    // Symulacja pauzowania -> przeniesienie do "cancelled" dla testów
    setData(prev => prev.map(item => item.id === id ? { ...item, status: 'cancelled' } : item));
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesTab = item.status === activeTab;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [data, activeTab, searchQuery]);

  const renderEmptyState = () => (
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
      <TouchableOpacity 
        style={styles.addButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddSubscription')}
      >
        <Text style={styles.addButtonText}>Dodaj nową</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header: Wyszukiwarka i Sortowanie */}
        <View style={styles.header}>
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
          <TouchableOpacity style={styles.sortButton} activeOpacity={0.7}>
            <ArrowUpDown size={20} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Zakładki (Tabs) */}
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

        {/* Główna lista */}
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredData.length === 0 ? styles.listEmptyContent : styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          renderItem={({ item }) => (
            <SubscriptionListItem 
              item={item} 
              onDelete={handleDelete}
              onPause={handlePause}
            />
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Jasne tło aplikacji
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#0F172A',
  },
  sortButton: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F1F5F9', // Jasnoszary dla nieaktywnego
  },
  tabButtonActive: {
    backgroundColor: '#0F172A', // Ciemny granat dla aktywnego
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 40,
  },
  listEmptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  // EMPTY STATE
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  addButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SubscriptionListScreen;
