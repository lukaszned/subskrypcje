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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Edit, Trash2, Calendar, CreditCard, 
  Tag, Clock, ExternalLink, CheckCircle, XCircle 
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../App';

// Hooks
import { useSubscription } from '../hooks/useSubscription';
import { useDeleteSubscription } from '../hooks/useDeleteSubscription';
import { usePaySubscription } from '../hooks/usePaySubscription';
import { useCancelSubscription } from '../hooks/useCancelSubscription';
import { CATEGORY_LABELS } from '../types/api';

export const SubscriptionDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AppStackParamList, 'SubscriptionDetail'>>();
  const { id } = route.params;

  const { data: sub, isLoading } = useSubscription(id);
  const deleteMutation = useDeleteSubscription();
  const payMutation = usePaySubscription();
  const cancelMutation = useCancelSubscription();

  if (isLoading || !sub) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

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

          {sub.isTrial && (
            <View style={styles.infoRow}>
              <Clock size={20} color="#F59E0B" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Okres próbny do</Text>
                <Text style={styles.infoValue}>{new Date(sub.trialEndDate!).toLocaleDateString('pl-PL')}</Text>
              </View>
            </View>
          )}

          {sub.cancelUrl && (
            <TouchableOpacity 
              style={styles.cancelUrlBtn} 
              onPress={() => Alert.alert('Zewnętrzny link', `Otworzyć stronę rezygnacji: ${sub.cancelUrl}?`)}
            >
              <ExternalLink size={20} color="#6366F1" />
              <Text style={styles.cancelUrlBtnText}>Strona rezygnacji</Text>
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
          <Text style={[styles.infoLabel, { marginBottom: 16 }]}>Historia płatności</Text>
          {sub.lastPaymentDate ? (
            <View style={styles.historyRow}>
              <View style={styles.historyDot} />
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>Ostatnia płatność</Text>
                <Text style={styles.historyDate}>{new Date(sub.lastPaymentDate).toLocaleDateString('pl-PL')}</Text>
              </View>
              <Text style={styles.historyAmount}>-{sub.amount.toFixed(2)} {sub.currency}</Text>
            </View>
          ) : (
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>Brak zarejestrowanych płatności.</Text>
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
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  historyContent: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  historyDate: { fontSize: 12, color: '#94A3B8' },
  historyAmount: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  deleteBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
});

export default SubscriptionDetailScreen;
