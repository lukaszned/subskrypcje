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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ArrowUpDown, Frown, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';

// Hooki
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useCancelSubscription } from '../hooks/useCancelSubscription';
import { usePaySubscription } from '../hooks/usePaySubscription';

// Typy
import { Subscription, CATEGORY_LABELS, BILLING_CYCLE_LABELS, SubscriptionStatus } from '../types/api';

// Komponent item
import SubscriptionListItem from './SubscriptionListItem';
import { vibrantTheme } from '../theme/vibrantTheme';
import { parseAppDate } from '../utils/date';

export const SubscriptionListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<SubscriptionStatus | 'all'>('all');
  const [sortOption, setSortOption] = useState<{ field: string, order: 'asc' | 'desc' }>({ field: 'nextPaymentDate', order: 'asc' });

  // Debounce search by doing it only on query key
  const { data: allSubscriptions = [], isLoading, isError, error, refetch } = useSubscriptions({
    search: searchQuery,
    status: activeStatus === 'all' ? undefined : activeStatus,
    sortBy: sortOption.field,
    sortOrder: sortOption.order
  });

  const cancelMutation = useCancelSubscription();
  const payMutation = usePaySubscription();

  const subscriptions = useMemo(() => (
    allSubscriptions
      .filter((item) => !!item?.id)
      .map((item) => ({
        ...item,
        name: item.name || item.provider || 'Subskrypcja',
        amount: Number(item.amount || 0),
        currency: item.currency || 'PLN',
        category: item.category || 'other',
        billingCycle: item.billingCycle || 'monthly',
        status: item.status || 'pending',
        isTrial: Boolean(item.isTrial),
      }))
  ), [allSubscriptions]);

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

  const toggleSort = () => {
    if (sortOption.field === 'nextPaymentDate') {
      setSortOption({ field: 'amount', order: 'desc' });
    } else if (sortOption.field === 'amount') {
      setSortOption({ field: 'name', order: 'asc' });
    } else {
      setSortOption({ field: 'nextPaymentDate', order: 'asc' });
    }
  };

  const getSortLabel = () => {
    if (sortOption.field === 'nextPaymentDate') return 'Data';
    if (sortOption.field === 'amount') return 'Cena';
    if (sortOption.field === 'name') return 'Nazwa';
    return 'Sortuj';
  };

  const renderEmptyState = () => {
    if (isError) {
      return (
        <View style={styles.emptyStateContainer}>
          <Frown size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Błąd ładowania</Text>
          <Text style={styles.emptyMessage} numberOfLines={3}>
            {error?.message || 'Nie udalo sie pobrac listy subskrypcji.'}
          </Text>
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
        {!searchQuery && activeStatus === 'all' && (
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
          category: CATEGORY_LABELS[item.category] || item.category || 'Inne',
          amount: item.amount,
          currency: item.currency,
          nextPaymentDate: item.nextPaymentDate ? (() => {
            const d = parseAppDate(item.nextPaymentDate);
            if (!d) return '-';
            return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
          })() : '-',
          cycle: BILLING_CYCLE_LABELS[item.billingCycle] || item.billingCycle || 'Co miesiÄ…c',
          status: item.status,
          isTrial: item.isTrial,
        }}
        onDelete={(id) => handleCancel(id, item.name)}
        onPause={(id) => handlePay(id, item.name)}
        onPress={() => navigation.navigate('SubscriptionDetail', { id: item.id })}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color={vibrantTheme.colors.text} /></TouchableOpacity>
          <View style={styles.searchContainer}>
            <Search size={20} color={vibrantTheme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Szukaj..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[styles.sortButton, { flexDirection: 'row', width: 'auto', paddingHorizontal: 12 }]}
            onPress={toggleSort}
          >
            <ArrowUpDown size={18} color={vibrantTheme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: vibrantTheme.colors.primary, fontWeight: '800', fontSize: 12 }}>{getSortLabel()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabs}>
            {[
              { id: 'all', label: 'Wszystkie' },
              { id: 'pending', label: 'Aktywne' },
              { id: 'paid', label: 'Opłacone' },
              { id: 'overdue', label: 'Zaległe' },
              { id: 'canceled', label: 'Anulowane' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.statusTab, activeStatus === tab.id && styles.statusTabActive]}
                onPress={() => setActiveStatus(tab.id as any)}
              >
                <Text style={[styles.statusTabText, activeStatus === tab.id && styles.statusTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={subscriptions.length === 0 && !isLoading ? styles.listEmptyContent : styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={vibrantTheme.colors.primary} />}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  container: { flex: 1 },
  header: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, alignItems: 'center', gap: 12 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: vibrantTheme.colors.card, borderRadius: 20, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: '100%', fontSize: 16, color: vibrantTheme.colors.text, fontWeight: '700' },
  sortButton: { width: 48, height: 50, backgroundColor: vibrantTheme.colors.card, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  filterSection: { paddingBottom: 16 },
  statusTabs: { paddingHorizontal: 20, gap: 10 },
  statusTab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 16, backgroundColor: vibrantTheme.colors.card, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  statusTabActive: { backgroundColor: 'rgba(32,246,181,0.18)', borderColor: vibrantTheme.colors.primary },
  statusTabText: { fontSize: 13, fontWeight: '700', color: vibrantTheme.colors.textMuted },
  statusTabTextActive: { color: vibrantTheme.colors.primary },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  listEmptyContent: { flex: 1, justifyContent: 'center' },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: vibrantTheme.colors.card, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: vibrantTheme.colors.text, marginBottom: 12 },
  emptyMessage: { color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 4 },
  addButton: { backgroundColor: vibrantTheme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: 12, ...vibrantTheme.shadows.glow },
  addButtonText: { color: vibrantTheme.colors.darkText, fontWeight: '900' },
});

export default SubscriptionListScreen;
