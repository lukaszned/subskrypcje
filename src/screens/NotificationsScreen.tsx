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
import { ArrowLeft, Bell, CalendarClock, CheckCircle2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useNotificationPreview } from '../hooks/useNotificationPreview';
import type { AppStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Notifications'>;

export const NotificationsScreen = React.memo(() => {
  const navigation = useNavigation<Navigation>();
  const { data, isLoading, isError, refetch, isRefetching } = useNotificationPreview();

  const nextReminder = useMemo(() => data?.nextReminder ?? null, [data]);
  const items = data?.items ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Powiadomienia</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366F1" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Bell size={24} color="#FFFFFF" />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Status przypomnień</Text>
            <Text style={styles.summaryTitle}>
              {data?.notificationsEnabled === false ? 'Wyłączone' : 'Aktywne'}
            </Text>
            <Text style={styles.summaryDescription}>
              Domyślnie {data?.defaultReminderDaysBefore ?? 1} dni przed płatnością.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : isError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>Nie udało się pobrać przypomnień</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>Ponów</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {nextReminder && (
              <View style={styles.nextCard}>
                <Text style={styles.sectionLabel}>Najbliższe</Text>
                <Text style={styles.nextTitle}>{nextReminder.name}</Text>
                <Text style={styles.nextDescription}>{nextReminder.body}</Text>
                <Text style={styles.nextDate}>
                  {new Date(nextReminder.remindAt).toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>Kolejka</Text>
            {items.length === 0 ? (
              <View style={styles.emptyCard}>
                <CheckCircle2 size={28} color="#10B981" />
                <Text style={styles.emptyTitle}>Brak zaplanowanych alertów</Text>
              </View>
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemIcon}>
                    <CalendarClock size={18} color="#6366F1" />
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>{item.name}</Text>
                    <Text style={styles.itemDate}>
                      {new Date(item.remindAt).toLocaleDateString('pl-PL', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 20, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    marginRight: 16,
  },
  summaryText: { flex: 1 },
  summaryLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  summaryTitle: { marginTop: 4, color: '#0F172A', fontSize: 22, fontWeight: '800' },
  summaryDescription: { marginTop: 4, color: '#64748B', fontSize: 13, lineHeight: 18 },
  centerState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  retryButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: '#6366F1' },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
  sectionLabel: { marginBottom: 12, color: '#94A3B8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  nextCard: { padding: 20, borderRadius: 24, backgroundColor: '#EEF2FF', marginBottom: 24, borderWidth: 1, borderColor: '#E0E7FF' },
  nextTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  nextDescription: { marginTop: 8, color: '#475569', fontSize: 14, lineHeight: 20 },
  nextDate: { marginTop: 14, color: '#6366F1', fontSize: 14, fontWeight: '800' },
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 24, backgroundColor: '#FFFFFF' },
  emptyTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, backgroundColor: '#FFFFFF', marginBottom: 10 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', marginRight: 12 },
  itemBody: { flex: 1 },
  itemTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  itemDate: { marginTop: 4, color: '#64748B', fontSize: 12, fontWeight: '600' },
});

export default NotificationsScreen;
