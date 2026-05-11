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
import { vibrantTheme } from '../theme/vibrantTheme';

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
          <ArrowLeft size={24} color={vibrantTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Powiadomienia</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={vibrantTheme.colors.primary} />}
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
            <ActivityIndicator size="large" color="#0B6B3A" />
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
                <CheckCircle2 size={28} color="#0B6B3A" />
                <Text style={styles.emptyTitle}>Brak zaplanowanych alertów</Text>
              </View>
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemIcon}>
                    <CalendarClock size={18} color="#0B6B3A" />
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
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: vibrantTheme.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: vibrantTheme.colors.border,
  },
  iconButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 21, fontWeight: '900', color: vibrantTheme.colors.text },
  content: { padding: 20, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 24,
    backgroundColor: vibrantTheme.colors.card,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 5,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: vibrantTheme.colors.primary,
    marginRight: 16,
  },
  summaryText: { flex: 1 },
  summaryLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  summaryTitle: { marginTop: 4, color: vibrantTheme.colors.text, fontSize: 22, fontWeight: '900' },
  summaryDescription: { marginTop: 4, color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  centerState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  retryButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: vibrantTheme.colors.primary, ...vibrantTheme.shadows.glow },
  retryText: { color: vibrantTheme.colors.darkText, fontWeight: '900' },
  sectionLabel: { marginBottom: 12, color: '#94A3B8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  nextCard: { padding: 20, borderRadius: 24, backgroundColor: 'rgba(32,246,181,0.12)', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(32,246,181,0.22)' },
  nextTitle: { color: vibrantTheme.colors.text, fontSize: 20, fontWeight: '900' },
  nextDescription: { marginTop: 8, color: vibrantTheme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  nextDate: { marginTop: 14, color: vibrantTheme.colors.primary, fontSize: 14, fontWeight: '900' },
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 24, backgroundColor: vibrantTheme.colors.card },
  emptyTitle: { color: vibrantTheme.colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, backgroundColor: vibrantTheme.colors.card, marginBottom: 10, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(32,246,181,0.13)', marginRight: 12 },
  itemBody: { flex: 1 },
  itemTitle: { color: vibrantTheme.colors.text, fontSize: 15, fontWeight: '900' },
  itemDate: { marginTop: 4, color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '700' },
});

export default NotificationsScreen;
