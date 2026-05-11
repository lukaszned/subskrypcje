import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CreditCard, Mail, Shield, ChevronRight, Wallet, User, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUserSettings, useUpdateUserSettings } from '../hooks/useUserSettings';
import { useEmailScanStatus } from '../hooks/useEmailScan';
import { useAuth } from '../context/AuthContext';
import type { AppStackParamList } from '../types/navigation';
import { vibrantTheme } from '../theme/vibrantTheme';

const USER_SETTING_CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'];

export const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Settings'>>();
  const { user, signOut } = useAuth();
  const { data: settings, isLoading } = useUserSettings();
  const { data: emailScanStatus } = useEmailScanStatus();
  const updateMutation = useUpdateUserSettings();

  // Local state for the form
  const [currency, setCurrency] = useState('PLN');
  const [reminderDays, setReminderDays] = useState(2);
  const [notifsEnabled, setNotifsEnabled] = useState(true);
  const [emailsEnabled, setEmailsEnabled] = useState(false);
  const [income, setIncome] = useState('');
  const [incomeCurrency, setIncomeCurrency] = useState('PLN');

  useEffect(() => {
    if (settings) {
      setCurrency(USER_SETTING_CURRENCIES.includes(settings.baseCurrency) ? settings.baseCurrency : 'PLN');
      setReminderDays(settings.defaultReminderDaysBefore);
      setNotifsEnabled(settings.notificationsEnabled);
      setEmailsEnabled(settings.emailReportsEnabled);
      setIncome(settings.monthlyIncome?.toString() || '');
      const nextIncomeCurrency = settings.incomeCurrency || settings.baseCurrency;
      setIncomeCurrency(USER_SETTING_CURRENCIES.includes(nextIncomeCurrency) ? nextIncomeCurrency : 'PLN');
    }
  }, [settings]);

  const handleSave = () => {
    const parsedIncome = income ? parseFloat(income.replace(',', '.')) : null;

    updateMutation.mutate({
      baseCurrency: currency,
      defaultReminderDaysBefore: reminderDays,
      notificationsEnabled: notifsEnabled,
      emailReportsEnabled: emailsEnabled,
      monthlyIncome: parsedIncome,
      incomeCurrency: incomeCurrency,
    }, {
      onSuccess: () => {
        Alert.alert('Sukces', 'Ustawienia zostały zapisane.');
      },
      onError: () => {
        Alert.alert('Błąd', 'Nie udało się zapisać ustawień.');
      }
    });
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <User size={32} color="#FFFFFF" />
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{user?.email?.split('@')[0] || 'Użytkownik'}</Text>
        <Text style={styles.profileEmail}>{user?.email || 'brak email'}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Plan Premium</Text>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0B6B3A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#14251B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ustawienia</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#0B6B3A" />
          ) : (
            <Text style={styles.saveBtnText}>Zapisz</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderProfileHeader()}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Finanse</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F3EC' }]}>
                <CreditCard size={20} color="#0B6B3A" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Waluta bazowa</Text>
                <Text style={styles.settingDesc}>W tej walucie widzisz podsumowania</Text>
              </View>
            </View>
            <View style={styles.currencyRow}>
              {USER_SETTING_CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.currencyPill, currency === c && styles.currencyPillActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.currencyPillText, currency === c && styles.currencyPillTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#F0F9FF' }]}>
                <Wallet size={20} color="#0EA5E9" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Miesięczny dochód</Text>
                <Text style={styles.settingDesc}>Dla udziału subskrypcji w dochodzie</Text>
              </View>
            </View>
            <View style={styles.incomeInputRow}>
              <TextInput
                style={styles.incomeInput}
                value={income}
                onChangeText={setIncome}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
              />
              <View style={styles.incomeCurrencyRow}>
                {USER_SETTING_CURRENCIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.miniPill, incomeCurrency === c && styles.miniPillActive]}
                    onPress={() => setIncomeCurrency(c)}
                  >
                    <Text style={[styles.miniPillText, incomeCurrency === c && styles.miniPillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Powiadomienia</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                <Bell size={20} color="#0B6B3A" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Powiadomienia Push</Text>
                <Text style={styles.settingDesc}>Przypomnienia o płatnościach</Text>
              </View>
            </View>
            <Switch
              value={notifsEnabled}
              onValueChange={setNotifsEnabled}
              trackColor={{ false: '#DDE6DF', true: '#0B6B3A' }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
                <Mail size={20} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Raporty Email</Text>
                <Text style={styles.settingDesc}>Miesięczne zestawienia kosztów</Text>
              </View>
            </View>
            <Switch
              value={emailsEnabled}
              onValueChange={setEmailsEnabled}
              trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#FFF7ED' }]}>
                <Shield size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Wyprzedzenie przypomnień</Text>
                <Text style={styles.settingDesc}>Ile dni przed terminem płatności</Text>
              </View>
            </View>
            <View style={styles.reminderRow}>
              {[1, 2, 3, 5, 7].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.reminderPill, reminderDays === d && styles.reminderPillActive]}
                  onPress={() => setReminderDays(d)}
                >
                  <Text style={[styles.reminderPillText, reminderDays === d && styles.reminderPillTextActive]}>{d}d</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Automatyzacja</Text>

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EmailScan')}
          >
            <View style={[styles.settingInfo, { marginBottom: 0 }]}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F3EC' }]}>
                <Mail size={20} color="#0B6B3A" />
              </View>
              <View style={styles.settingTextBlock}>
                <View style={styles.settingTitleRow}>
                  <Text style={styles.settingTitle}>Wykrywanie z Gmaila</Text>
                  {emailScanStatus?.pendingDetectionsCount ? (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>{emailScanStatus.pendingDetectionsCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.settingDesc}>
                  Privacy-first review kandydatur z rachunków i triali
                </Text>
              </View>
              <ChevronRight size={20} color="#CBD5E1" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Sub-Sentry v1.0.0 (MVP)</Text>
          <Text style={styles.footerInfo}>Twoje dane są bezpieczne i szyfrowane.</Text>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Alert.alert(
                'Wyloguj się',
                'Czy na pewno chcesz się wylogować?',
                [
                  { text: 'Anuluj', style: 'cancel' },
                  { text: 'Wyloguj', style: 'destructive', onPress: signOut }
                ]
              );
            }}
          >
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Wyloguj się</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: vibrantTheme.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: vibrantTheme.colors.border
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 21, fontWeight: '900', color: vibrantTheme.colors.text },
  saveBtnText: { color: vibrantTheme.colors.primary, fontWeight: '900', fontSize: 16 },
  content: { padding: 20 },
  section: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: vibrantTheme.colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16
  },
  settingItem: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'column', // Changed to column for better responsiveness with pills
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 5,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12, // Gap if there's a pill row below
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  settingTitle: { fontSize: 15, fontWeight: '900', color: vibrantTheme.colors.text },
  settingDesc: { fontSize: 12, color: vibrantTheme.colors.textMuted, marginTop: 2 },
  settingTextBlock: { flex: 1 },
  settingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: vibrantTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: { color: vibrantTheme.colors.darkText, fontSize: 11, fontWeight: '900' },
  currencyRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  currencyPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  currencyPillActive: {
    backgroundColor: 'rgba(32,246,181,0.16)',
    borderColor: vibrantTheme.colors.primary
  },
  currencyPillText: { fontSize: 13, fontWeight: '700', color: vibrantTheme.colors.textMuted },
  currencyPillTextActive: { color: vibrantTheme.colors.primary },
  reminderRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  reminderPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)'
  },
  reminderPillActive: { backgroundColor: vibrantTheme.colors.primary },
  reminderPillText: { fontSize: 13, fontWeight: '700', color: vibrantTheme.colors.textMuted },
  reminderPillTextActive: { color: vibrantTheme.colors.darkText },
  incomeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  incomeInput: {
    flex: 1,
    height: 48,
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: vibrantTheme.colors.text,
  },
  incomeCurrencyRow: {
    flexDirection: 'row',
    gap: 4,
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  miniPillActive: {
    backgroundColor: 'rgba(32,246,181,0.16)',
    borderColor: vibrantTheme.colors.primary,
  },
  miniPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: vibrantTheme.colors.textMuted,
  },
  miniPillTextActive: {
    color: vibrantTheme.colors.primary,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: vibrantTheme.colors.cardStrong,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: vibrantTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: vibrantTheme.colors.text,
  },
  profileEmail: {
    fontSize: 14,
    color: vibrantTheme.colors.textMuted,
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(32,246,181,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.primary,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: vibrantTheme.colors.primary,
    textTransform: 'uppercase',
  },
  footer: { marginTop: 20, marginBottom: 40, alignItems: 'center' },
  versionText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  footerInfo: { fontSize: 12, color: '#CBD5E1', marginTop: 4 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#FFF1F2',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default SettingsScreen;
