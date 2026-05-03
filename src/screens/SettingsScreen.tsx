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
import { useUserSettings, useUpdateUserSettings } from '../hooks/useUserSettings';
import { useAuth } from '../context/AuthContext';

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { data: settings, isLoading } = useUserSettings();
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
      setCurrency(settings.baseCurrency);
      setReminderDays(settings.defaultReminderDaysBefore);
      setNotifsEnabled(settings.notificationsEnabled);
      setEmailsEnabled(settings.emailReportsEnabled);
      setIncome(settings.monthlyIncome?.toString() || '');
      setIncomeCurrency(settings.incomeCurrency || settings.baseCurrency);
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
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ustawienia</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#6366F1" />
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
              <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                <CreditCard size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Waluta bazowa</Text>
                <Text style={styles.settingDesc}>W tej walucie widzisz podsumowania</Text>
              </View>
            </View>
            <View style={styles.currencyRow}>
              {['PLN', 'EUR', 'USD'].map(c => (
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
                <Text style={styles.settingDesc}>Dla analizy wpływu na budżet</Text>
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
                {['PLN', 'EUR', 'USD'].map(c => (
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
                <Bell size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Powiadomienia Push</Text>
                <Text style={styles.settingDesc}>Przypomnienia o płatnościach</Text>
              </View>
            </View>
            <Switch 
              value={notifsEnabled} 
              onValueChange={setNotifsEnabled}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
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
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  saveBtnText: { color: '#6366F1', fontWeight: '700', fontSize: 16 },
  content: { padding: 20 },
  section: { marginBottom: 32 },
  sectionLabel: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#94A3B8', 
    textTransform: 'uppercase', 
    letterSpacing: 1,
    marginBottom: 16
  },
  settingItem: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12,
    flexDirection: 'column', // Changed to column for better responsiveness with pills
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  settingTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  settingDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  currencyRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  currencyPill: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 10, 
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  currencyPillActive: { 
    backgroundColor: '#EEF2FF', 
    borderColor: '#6366F1' 
  },
  currencyPillText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  currencyPillTextActive: { color: '#6366F1' },
  reminderRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  reminderPill: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10, 
    backgroundColor: '#F1F5F9' 
  },
  reminderPillActive: { backgroundColor: '#0F172A' },
  reminderPillText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  reminderPillTextActive: { color: '#FFFFFF' },
  incomeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  incomeInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  incomeCurrencyRow: {
    flexDirection: 'row',
    gap: 4,
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  miniPillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  miniPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  miniPillTextActive: {
    color: '#6366F1',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366F1',
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
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
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
