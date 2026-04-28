// =============================================================
// src/screens/SubscriptionDetailScreen.tsx
//
// Szczegóły subskrypcji z akcjami (Opłać, Edytuj, Usuń, Anuluj).
// =============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Edit, Trash2, Calendar, CreditCard, 
  Tag, Clock, ExternalLink, CheckCircle, XCircle, ArrowRight
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../App';

// Hooks
import { useSubscription } from '../hooks/useSubscription';
import { useSubscriptionHistory } from '../hooks/useSubscriptionHistory';
import { useDeleteSubscription } from '../hooks/useDeleteSubscription';
import { usePaySubscription } from '../hooks/usePaySubscription';
import { useCancelSubscription } from '../hooks/useCancelSubscription';
import { CATEGORY_LABELS, SubscriptionEvent } from '../types/api';

export const SubscriptionDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AppStackParamList, 'SubscriptionDetail'>>();
  const { id } = route.params;

  const { data: sub, isLoading: isSubLoading } = useSubscription(id);
  const { data: historyData, isLoading: isHistoryLoading } = useSubscriptionHistory(id);

  const deleteMutation = useDeleteSubscription();
  const payMutation = usePaySubscription();
  const cancelMutation = useCancelSubscription();

  const isLoading = isSubLoading || isHistoryLoading;

  if (isLoading || !sub) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#0F172A" /></TouchableOpacity>
        </View>
        <View style={{ padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <View style={[styles.logoContainer, { backgroundColor: '#E2E8F0' }]} />
            <View style={{ width: 150, height: 24, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 8 }} />
            <View style={{ width: 100, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
          </View>
          <View style={{ height: 200, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  const openCancelUrl = () => {
    if (sub.cancelUrl) {
      Linking.openURL(sub.cancelUrl).catch(() => {
        Alert.alert('Błąd', 'Nie można otworzyć linku rezygnacji.');
      });
    }
  };

  const handleDelete = () => {
    Alert.alert('Usuń subskrypcję', 'Czy na pewno chcesz trwale usunąć tę subskrypcję?', [
      { text: 'Anuluj', style: 'cancel' },
      { 
        text: 'Usuń', 
        style: 'destructive', 
        onPress: () => deleteMutation.mutate(id, { onSuccess: () => navigation.goBack() }) 
      },
    ]);
  };

  const handlePay = () => {
    payMutation.mutate(id, {
      onSuccess: () => Alert.alert('Sukces', 'Subskrypcja została oznaczona jako opłacona.'),
    });
  };

  const handleCancel = () => {
    Alert.alert('Anuluj subskrypcję', 'Czy na pewno chcesz oznaczyć tę subskrypcję jako anulowaną?', [
      { text: 'Nie', style: 'cancel' },
      { 
        text: 'Tak, anuluj', 
        onPress: () => cancelMutation.mutate(id) 
      },
    ]);
  };

  const nextDate = new Date(sub.nextPaymentDate);
  const diffDays = Math.ceil((nextDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#0F172A" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Szczegóły</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddSubscription', { subscriptionId: id })}>
          <Edit size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>{sub.name.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{sub.name}</Text>
          {sub.provider && <Text style={styles.provider}>{sub.provider}</Text>}
          <View style={styles.priceTag}>
            <Text style={styles.price}>{sub.amount.toFixed(2)} {sub.currency}</Text>
            <Text style={styles.cycle}>/ {sub.billingCycle}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {sub.status !== 'canceled' && (
            <TouchableOpacity style={styles.actionBtn} onPress={handlePay} disabled={payMutation.isPending}>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Opłać</Text>
            </TouchableOpacity>
          )}
          {sub.status !== 'canceled' ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={handleCancel}>
              <XCircle size={20} color="#EF4444" />
              <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Anuluj</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.canceledBadge}>
              <Text style={styles.canceledBadgeText}>ANULOWANA</Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Calendar size={20} color="#94A3B8" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Następna płatność</Text>
              <Text style={styles.infoValue}>{nextDate.toLocaleDateString('pl-PL')} ({diffDays > 0 ? `za ${diffDays} dni` : 'dziś'})</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Tag size={20} color="#94A3B8" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Kategoria</Text>
              <Text style={styles.infoValue}>{CATEGORY_LABELS[sub.category]}</Text>
            </View>
          </View>

          {sub.isTrial && sub.trialEndDate && (
            <View style={[styles.infoRow, { backgroundColor: '#FFFBEB', padding: 12, borderRadius: 16, marginBottom: 12 }]}>
              <Clock size={20} color="#F59E0B" />
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: '#D97706' }]}>Okres próbny</Text>
                <Text style={styles.infoValue}>
                  Kończy się {new Date(sub.trialEndDate).toLocaleDateString('pl-PL')}
                  {Math.ceil((new Date(sub.trialEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) > 0 
                    ? ` (za ${Math.ceil((new Date(sub.trialEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} dni)` 
                    : ' (dziś)'}
                </Text>
              </View>
            </View>
          )}

          {sub.cancelUrl && (
            <TouchableOpacity 
              style={styles.cancelUrlBtn} 
              onPress={openCancelUrl}
            >
              <ExternalLink size={20} color="#6366F1" />
              <Text style={styles.cancelUrlBtnText}>Otwórz stronę rezygnacji</Text>
            </TouchableOpacity>
          )}
        </View>

        {sub.notes && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Notatki</Text>
            <Text style={styles.notesText}>{sub.notes}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.infoLabel}>Historia aktywności</Text>
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>{historyData?.count || 0} zdarzeń</Text>
            </View>
          </View>
          
          {historyData?.items && historyData.items.length > 0 ? (
            <View style={styles.historyList}>
              {historyData.items.map((event: SubscriptionEvent, index: number) => (
                <View key={event.id} style={styles.historyItem}>
                  <View style={[
                    styles.historyDot, 
                    { backgroundColor: event.type === 'paid' ? '#10B981' : event.type === 'canceled' ? '#EF4444' : '#6366F1' }
                  ]} />
                  {index < historyData.items.length - 1 && <View style={styles.historyLine} />}
                  <View style={styles.historyMain}>
                    <Text style={styles.historyTitle}>
                      {event.type === 'created' ? 'Utworzono subskrypcję' : 
                       event.type === 'paid' ? 'Odnotowano płatność' : 
                       event.type === 'canceled' ? 'Anulowano subskrypcję' : 'Zaktualizowano dane'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(event.createdAt).toLocaleString('pl-PL', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </Text>
                    {event.type === 'paid' && event.payload?.newNextPaymentDate && (
                      <Text style={styles.historyPayload}>
                        Następna: {new Date(event.payload.newNextPaymentDate).toLocaleDateString('pl-PL')}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#64748B', fontSize: 14, marginTop: 8 }}>Brak historii zdarzeń.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Trash2 size={20} color="#EF4444" />
          <Text style={styles.deleteBtnText}>Usuń subskrypcję na stałe</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  hero: { alignItems: 'center', marginBottom: 30 },
  logoContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  name: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  provider: { fontSize: 16, color: '#64748B', marginTop: 4 },
  priceTag: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  price: { fontSize: 28, fontWeight: '800', color: '#6366F1' },
  cycle: { fontSize: 16, color: '#94A3B8', marginLeft: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  actionBtn: { flex: 1, height: 50, borderRadius: 16, backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EF4444' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  canceledBadge: { flex: 1, height: 50, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  canceledBadgeText: { color: '#94A3B8', fontWeight: '800', fontSize: 14 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  infoTextContainer: { marginLeft: 16 },
  infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 16, color: '#0F172A', fontWeight: '600', marginTop: 2 },
  cancelUrlBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelUrlBtnText: { color: '#6366F1', fontWeight: '600' },
  notesText: { fontSize: 15, color: '#475569', marginTop: 8, lineHeight: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  historyBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  historyBadgeText: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  historyList: { gap: 16 },
  historyItem: { flexDirection: 'row', gap: 12, minHeight: 60 },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, zIndex: 2 },
  historyLine: { position: 'absolute', left: 4.5, top: 16, bottom: -16, width: 1, backgroundColor: '#E2E8F0' },
  historyMain: { flex: 1, paddingBottom: 20 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  historyDate: { fontSize: 12, color: '#64748B', marginTop: 2 },
  historyPayload: { fontSize: 11, color: '#6366F1', fontWeight: '600', marginTop: 4 },
  historyAmount: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  deleteBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
});

export default SubscriptionDetailScreen;
