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
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  CreditCard,
  LogOut,
  Mail,
  Palette,
  RefreshCw,
  Shield,
  TriangleAlert,
  User,
  Wallet,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUserSettings, useUpdateUserSettings } from '../hooks/useUserSettings';
import { usePersistentIncome, useSavePersistentIncome } from '../hooks/usePersistentIncome';
import { useEmailScanStatus } from '../hooks/useEmailScan';
import { useAuth } from '../context/AuthContext';
import type { AppStackParamList } from '../types/navigation';
import type { UpdateUserSettingsPayload } from '../api/dashboard';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme, ThemeName } from '../theme/ThemeContext';
import { withAlpha } from '../theme/themeUtils';
import { goBackOrDashboard } from '../utils/navigation';

const USER_SETTING_CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'];

type SaveFeedback = {
  kind: 'synced' | 'pending' | 'error';
  title: string;
  message: string;
  syncStartedAt?: number;
};

export const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Settings'>>();
  const { user, signOut } = useAuth();
  const {
    data: settings,
    dataUpdatedAt: settingsUpdatedAt,
    isFetching: isSettingsFetching,
    isLoading,
  } = useUserSettings();
  const { data: localIncome } = usePersistentIncome();
  const { data: emailScanStatus } = useEmailScanStatus();
  const updateMutation = useUpdateUserSettings();
  const savePersistentIncome = useSavePersistentIncome();
  const { theme, themeName, setThemeName, themes } = useTheme();
  const themeOptions = Object.values(themes);

  // Local state for the form
  const [currency, setCurrency] = useState('PLN');
  const [reminderDays, setReminderDays] = useState(2);
  const [notifsEnabled, setNotifsEnabled] = useState(true);
  const [emailsEnabled, setEmailsEnabled] = useState(false);
  const [income, setIncome] = useState('');
  const [incomeCurrency, setIncomeCurrency] = useState('PLN');
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);
  const isSaving = updateMutation.isPending || savePersistentIncome.isPending;

  useEffect(() => {
    if (settings) {
      setCurrency(USER_SETTING_CURRENCIES.includes(settings.baseCurrency) ? settings.baseCurrency : 'PLN');
      setReminderDays(settings.defaultReminderDaysBefore);
      setNotifsEnabled(settings.notificationsEnabled);
      setEmailsEnabled(settings.emailReportsEnabled);
      const nextIncome = settings.monthlyIncome ?? localIncome?.monthlyIncome ?? null;
      setIncome(nextIncome ? nextIncome.toString() : '');
      const nextIncomeCurrency = settings.incomeCurrency || localIncome?.incomeCurrency || settings.baseCurrency;
      setIncomeCurrency(USER_SETTING_CURRENCIES.includes(nextIncomeCurrency) ? nextIncomeCurrency : 'PLN');
      return;
    }

    if (localIncome) {
      setIncome(localIncome.monthlyIncome ? localIncome.monthlyIncome.toString() : '');
      setIncomeCurrency(USER_SETTING_CURRENCIES.includes(localIncome.incomeCurrency) ? localIncome.incomeCurrency : 'PLN');
    }
  }, [settings, localIncome]);

  useEffect(() => {
    if (
      saveFeedback?.kind !== 'pending' ||
      !settings ||
      isSettingsFetching ||
      (settings as any).__localOnly ||
      settingsUpdatedAt < (saveFeedback.syncStartedAt ?? Number.POSITIVE_INFINITY)
    ) {
      return;
    }

    setSaveFeedback({
      kind: 'synced',
      title: 'Synchronizacja zakończona',
      message: 'Ustawienia są zapisane na tym urządzeniu i na Twoim koncie.',
    });
  }, [isSettingsFetching, saveFeedback, settings, settingsUpdatedAt]);

  useEffect(() => {
    if (saveFeedback?.kind !== 'synced') return;

    const timeout = setTimeout(() => setSaveFeedback(null), 3500);
    return () => clearTimeout(timeout);
  }, [saveFeedback?.kind]);

  const getErrorMessage = (error: any) => {
    const validationErrors = error?.body?.errors;
    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
      return validationErrors
        .map((item: any) => `${item.field || 'pole'}: ${item.message || 'nieprawidłowa wartość'}`)
        .join('\n');
    }

    return error?.body?.message || error?.message || 'Nie udało się zapisać ustawień.';
  };

  const handleSave = () => {
    if (isSaving) return;

    setSaveFeedback(null);
    const normalizedIncome = income.trim().replace(/\s/g, '').replace(',', '.');
    const parsedIncome = normalizedIncome ? Number(normalizedIncome) : null;

    if (parsedIncome !== null && (!Number.isFinite(parsedIncome) || parsedIncome < 0)) {
      Alert.alert('Nieprawidłowa wartość', 'Miesięczny dochód musi być dodatnią liczbą albo pustym polem.');
      return;
    }

    const payload: UpdateUserSettingsPayload = {
      baseCurrency: currency,
      defaultReminderDaysBefore: reminderDays,
      notificationsEnabled: notifsEnabled,
      emailReportsEnabled: emailsEnabled,
      monthlyIncome: parsedIncome,
      incomeCurrency: incomeCurrency,
    };

    savePersistentIncome.mutate({
      monthlyIncome: parsedIncome,
      incomeCurrency,
    });

    updateMutation.mutate(payload, {
      onSuccess: (updatedSettings) => {
        if ((updatedSettings as any).__localOnly) {
          setSaveFeedback({
            kind: 'pending',
            title: 'Zapisano na urządzeniu',
            message: 'Połączenie jest chwilowo niedostępne. Synchronizacja ponowi się automatycznie w tle.',
            syncStartedAt: Date.now(),
          });
          return;
        }

        setSaveFeedback({
          kind: 'synced',
          title: 'Ustawienia zapisane',
          message: 'Zmiany są już aktywne.',
        });
      },
      onError: (error) => {
        if (__DEV__) {
          console.warn('[SettingsScreen] Save settings error:', error);
        }
        setSaveFeedback({
          kind: 'error',
          title: 'Nie udało się zapisać',
          message: getErrorMessage(error),
        });
      }
    });
  };
  const renderSaveFeedback = () => {
    if (!saveFeedback) return null;

    const isSynced = saveFeedback.kind === 'synced';
    const isPending = saveFeedback.kind === 'pending';
    const accent = isSynced
      ? theme.colors.primary
      : isPending
        ? theme.colors.warning
        : theme.colors.danger;
    const Icon = isSynced ? CheckCircle2 : isPending ? CloudOff : TriangleAlert;

    return (
      <View
        style={[
          styles.saveFeedback,
          {
            backgroundColor: withAlpha(accent, 0.1),
            borderColor: withAlpha(accent, 0.28),
          },
        ]}
      >
        <View style={[styles.saveFeedbackIcon, { backgroundColor: withAlpha(accent, 0.14) }]}>
          <Icon size={19} color={accent} />
        </View>
        <View style={styles.saveFeedbackCopy}>
          <Text style={[styles.saveFeedbackTitle, { color: theme.colors.text }]}>{saveFeedback.title}</Text>
          <Text style={[styles.saveFeedbackMessage, { color: theme.colors.textMuted }]}>{saveFeedback.message}</Text>
        </View>
        {!isSynced ? (
          <TouchableOpacity
            style={[styles.retrySaveButton, { backgroundColor: withAlpha(accent, 0.14) }]}
            onPress={handleSave}
            disabled={isSaving}
            accessibilityLabel="Ponów zapis ustawień"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <RefreshCw size={17} color={accent} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderProfileHeader = () => (
    <View style={[styles.profileHeader, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border }]}>
      <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}>
        <User size={32} color={theme.colors.darkText} />
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{user?.email?.split('@')[0] || 'Użytkownik'}</Text>
        <Text style={[styles.profileEmail, { color: theme.colors.textMuted }]}>{user?.email || 'brak email'}</Text>
      </View>
    </View>
  );

  if (isLoading && !localIncome) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.bg, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => goBackOrDashboard(navigation)} style={styles.backBtn} accessibilityLabel="Wstecz">
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Ustawienia</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[styles.saveBtnText, { color: theme.colors.primary }]}>Zapisz</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderSaveFeedback()}
        {renderProfileHeader()}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>Wygląd aplikacji</Text>
          <View style={[styles.settingItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.settingInfo, { marginBottom: 14 }]}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Palette size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.settingTextBlock}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Motyw kolorystyczny</Text>
              </View>
            </View>
            <View style={styles.themePickerRow}>
              {themeOptions.map((item) => {
                const selected = themeName === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={styles.themeOption}
                    activeOpacity={0.82}
                    onPress={() => setThemeName(item.name as ThemeName)}
                  >
                    <View
                      style={[
                        styles.themeSwatchOuter,
                        selected && {
                          borderColor: item.colors.primary,
                          shadowColor: item.colors.primary,
                          shadowOpacity: 0.36,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.themeSwatch,
                          { backgroundColor: item.colors.primary },
                          item.name === 'monochrome' && styles.themeSwatchMono,
                        ]}
                      />
                    </View>
                    <Text style={[styles.themeOptionText, selected && { color: theme.colors.primary }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Finanse</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <CreditCard size={20} color={theme.colors.primary} />
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
                  style={[styles.currencyPill, currency === c && { backgroundColor: `${theme.colors.primary}24`, borderColor: theme.colors.primary }]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.currencyPillText, { color: theme.colors.textMuted }, currency === c && { color: theme.colors.primary }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.cyan}18` }]}>
                <Wallet size={20} color={theme.colors.cyan} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Miesięczny dochód netto</Text>
                <Text style={styles.settingDesc}>Zapisywany lokalnie i używany na Dashboardzie</Text>
              </View>
            </View>
            <View style={styles.incomeInputRow}>
              <TextInput
                style={styles.incomeInput}
                value={income}
                onChangeText={setIncome}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSubtle}
              />
              <View style={styles.incomeCurrencyRow}>
                {USER_SETTING_CURRENCIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.miniPill, incomeCurrency === c && { backgroundColor: `${theme.colors.primary}24`, borderColor: theme.colors.primary }]}
                    onPress={() => setIncomeCurrency(c)}
                  >
                    <Text style={[styles.miniPillText, { color: theme.colors.textMuted }, incomeCurrency === c && { color: theme.colors.primary }]}>{c}</Text>
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
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Bell size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Powiadomienia Push</Text>
                <Text style={styles.settingDesc}>Przypomnienia o płatnościach</Text>
              </View>
            </View>
            <Switch
              value={notifsEnabled}
              onValueChange={setNotifsEnabled}
              trackColor={{
                false: theme.colors.borderStrong,
                true: withAlpha(theme.colors.primary, 0.45),
              }}
              thumbColor={notifsEnabled ? theme.colors.primary : theme.colors.textMuted}
              ios_backgroundColor={theme.colors.borderStrong}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.cyan}18` }]}>
                <Mail size={20} color={theme.colors.cyan} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Raporty Email</Text>
                <Text style={styles.settingDesc}>Miesięczne zestawienia kosztów</Text>
              </View>
            </View>
            <Switch
              value={emailsEnabled}
              onValueChange={setEmailsEnabled}
              trackColor={{ false: theme.colors.borderStrong, true: theme.colors.cyan }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.warning}18` }]}>
                <Shield size={20} color={theme.colors.warning} />
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
                  style={[styles.reminderPill, reminderDays === d && { backgroundColor: theme.colors.primary }]}
                  onPress={() => setReminderDays(d)}
                >
                  <Text style={[styles.reminderPillText, { color: theme.colors.textMuted }, reminderDays === d && { color: theme.colors.darkText }]}>{d}d</Text>
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
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Mail size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.settingTextBlock}>
                <View style={styles.settingTitleRow}>
                  <Text style={styles.settingTitle}>Znalezione z Gmaila</Text>
                  {emailScanStatus?.pendingDetectionsCount ? (
                    <View style={[styles.pendingBadge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.pendingBadgeText, { color: theme.colors.darkText }]}>{emailScanStatus.pendingDetectionsCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.settingDesc}>
                  Przegląd pozycji znalezionych w mailach, bez automatycznego dodawania
                </Text>
              </View>
              <ChevronRight size={20} color={theme.colors.textSubtle} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Sub-Sentry v1.0.0 (MVP)</Text>
          <Text style={styles.footerInfo}>Twoje dane są bezpieczne i szyfrowane.</Text>

          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: `${theme.colors.danger}14`, borderColor: `${theme.colors.danger}33` }]}
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
            <LogOut size={20} color={theme.colors.danger} />
            <Text style={[styles.logoutBtnText, { color: theme.colors.danger }]}>Wyloguj się</Text>
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
  themePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  themeSwatchOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  themeSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  themeSwatchMono: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  themeOptionText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
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
    backgroundColor: 'rgba(255,255,255,0.16)',
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
    backgroundColor: 'rgba(255,255,255,0.16)',
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
  saveFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    marginBottom: 18,
  },
  saveFeedbackIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveFeedbackCopy: {
    flex: 1,
  },
  saveFeedbackTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  saveFeedbackMessage: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 2,
  },
  retrySaveButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
    backgroundColor: '#FFF1F2',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default SettingsScreen;
