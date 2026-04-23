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
import { Search, ArrowUpDown, Frown, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import SubscriptionListItem, { SubscriptionItem } from './SubscriptionListItem';
import { useSubscriptionStore } from '../store/useSubscriptionStore';


export const SubscriptionListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { subscriptions, removeSubscription, togglePauseStatus } = useSubscriptionStore();
  const data = subscriptions;


  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'cancelled'>('active');
  const [sortBy, setSortBy] = useState<'none' | 'priceAsc' | 'priceDesc' | 'dateAsc'>('none');

  const toggleSort = () => {
    if (sortBy === 'none') setSortBy('priceDesc');
    else if (sortBy === 'priceDesc') setSortBy('priceAsc');
    else if (sortBy === 'priceAsc') setSortBy('dateAsc');
    else setSortBy('none');
  };


  const handleDelete = (id: string) => {
    removeSubscription(id);
  };

  const handlePause = (id: string) => {
    togglePauseStatus(id);
  };


  const filteredData = useMemo(() => {
    let result = data.filter(item => {
      const matchesTab = item.status === activeTab;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });

    if (sortBy === 'priceAsc') {
      result.sort((a, b) => a.amount - b.amount);
    } else if (sortBy === 'priceDesc') {
      result.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'dateAsc') {
      // Proste sortowanie daty - mock.
      result.sort((a, b) => {
        if (a.nextPaymentDate === '-') return 1;
        if (b.nextPaymentDate === '-') return -1;
        return a.nextPaymentDate.localeCompare(b.nextPaymentDate);
      });
    }

    return result;
  }, [data, activeTab, searchQuery, sortBy]);


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
              <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#6366F1', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>
                  {sortBy === 'priceDesc' ? '$$$' : sortBy === 'priceAsc' ? '$' : 'Data'}
                </Text>
              </View>
            )}
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
  backButton: {
    padding: 4,
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
