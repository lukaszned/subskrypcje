import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CalendarClock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useNotificationPreview } from '../hooks/useNotificationPreview';
import type { AppStackParamList } from '../types/navigation';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { SkeletonList } from '../components/LoadingState';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Notifications'>;

export const NotificationsScreen = React.memo(() => {
  const navigation = useNavigation<Navigation>();
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useNotificationPreview();

  const nextReminder = useMemo(() => data?.nextReminder ?? null, [data]);
  const items = data?.items ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.bg, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Powiadomienia</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.summaryIcon, { backgroundColor: theme.colors.primary }]}>
            <Bell size={24} color="#FFFFFF" />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Status przypomnień</Text>
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
              {data?.notificationsEnabled === false ? 'Wyłączone' : 'Aktywne'}
            </Text>
            <Text style={[styles.summaryDescription, { color: theme.colors.textMuted }]}>
              Domyślnie {data?.defaultReminderDaysBefore ?? 1} dni przed płatnością.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={[styles.centerState, { alignItems: 'stretch' }]}>
            <SkeletonList rows={3} isDark />
          </View>
        ) : isError ? (
          <ErrorState
            message="Nie udało się odświeżyć przypomnień. Pokażemy je ponownie, gdy odświeżanie się uda."
            onRetry={() => refetch()}
          />
        ) : (
          <>
            {nextReminder && (
              <View style={[styles.nextCard, { backgroundColor: `${theme.colors.primary}18`, borderColor: `${theme.colors.primary}33` }]}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>Najbliższe</Text>
                <Text style={[styles.nextTitle, { color: theme.colors.text }]}>{nextReminder.name}</Text>
                <Text style={[styles.nextDescription, { color: theme.colors.textMuted }]}>{nextReminder.body}</Text>
                <Text style={[styles.nextDate, { color: theme.colors.primary }]}>
                  {new Date(nextReminder.remindAt).toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>Kolejka</Text>
            {items.length === 0 ? (
              <EmptyState
                type="calm"
                title="Brak zaplanowanych alertów"
                message="Gdy pojawią się płatności albo triale do przypomnienia, zobaczysz je tutaj."
              />
            ) : (
              items.map((item) => (
                <View key={item.id} style={[styles.itemCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.itemIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                    <CalendarClock size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.itemDate, { color: theme.colors.textMuted }]}>
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
  nextCard: { padding: 20, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  nextTitle: { color: vibrantTheme.colors.text, fontSize: 20, fontWeight: '900' },
  nextDescription: { marginTop: 8, color: vibrantTheme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  nextDate: { marginTop: 14, color: vibrantTheme.colors.primary, fontSize: 14, fontWeight: '900' },
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 24, backgroundColor: vibrantTheme.colors.card },
  emptyTitle: { color: vibrantTheme.colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, backgroundColor: vibrantTheme.colors.card, marginBottom: 10, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.13)', marginRight: 12 },
  itemBody: { flex: 1 },
  itemTitle: { color: vibrantTheme.colors.text, fontSize: 15, fontWeight: '900' },
  itemDate: { marginTop: 4, color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '700' },
});

export default NotificationsScreen;
