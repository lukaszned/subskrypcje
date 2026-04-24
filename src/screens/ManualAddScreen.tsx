// =============================================================
// src/screens/ManualAddScreen.tsx
//
// Formularz dodawania nowej subskrypcji.
//
// ZMIANY vs MOCK:
//   - handleSave wywołuje useCreateSubscription (POST /subscriptions)
//   - kategorie zmapowane na backend enums (SubscriptionCategory)
//   - cykle zmapowane na backend enums (BillingCycle)
//   - obsługa 409 conflict (duplikat) z informacją dla usera
//   - po sukcesie: navigation.goBack() (cache auto-invalidated przez hook)
// =============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Edit2, Calendar, LayoutGrid, RotateCw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

// Hook
import { useCreateSubscription } from '../hooks/useCreateSubscription';

// Typy
import {
  SubscriptionCategory,
  BillingCycle,
  CreateSubscriptionPayload,
} from '../types/api';

// Błędy API
import { ApiError } from '../lib/apiClient';

// ─────────────────────────────────────────────────────────────
// STAŁE — zmapowane na backend enums
// ─────────────────────────────────────────────────────────────

const CATEGORIES: Array<{
  id: SubscriptionCategory;
  label: string;
  color: string;
  textColor: string;
}> = [
  { id: 'entertainment', label: 'Rozrywka',      color: '#E0E7FF', textColor: '#4F46E5' },
  { id: 'utilities',     label: 'Narzędzia',     color: '#DBEAFE', textColor: '#2563EB' },
  { id: 'health',        label: 'Zdrowie',        color: '#DCFCE7', textColor: '#16A34A' },
  { id: 'education',     label: 'Edukacja',       color: '#FEF9C3', textColor: '#CA8A04' },
  { id: 'productivity',  label: 'Produktywność',  color: '#FCE7F3', textColor: '#BE185D' },
  { id: 'shopping',      label: 'Zakupy',         color: '#FEF3C7', textColor: '#D97706' },
  { id: 'finance',       label: 'Finanse',        color: '#ECFDF5', textColor: '#059669' },
  { id: 'transport',     label: 'Transport',      color: '#F0F9FF', textColor: '#0284C7' },
  { id: 'other',         label: 'Inne',           color: '#F1F5F9', textColor: '#64748B' },
];

const CYCLES: Array<{ id: BillingCycle; label: string }> = [
  { id: 'monthly',  label: 'Co miesiąc' },
  { id: 'yearly',   label: 'Co rok'     },
  { id: 'weekly',   label: 'Co tydzień' },
  { id: 'one_time', label: 'Jednorazowo'},
  { id: 'custom',   label: 'Inny'       },
];

// ─────────────────────────────────────────────────────────────
// EKRAN
// ─────────────────────────────────────────────────────────────

export const ManualAddScreen = () => {
  const navigation = useNavigation();
  const amountInputRef = useRef<TextInput>(null);
  const createSubscription = useCreateSubscription();

  // ── Stan formularza ──────────────────────────────────────────
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState<SubscriptionCategory>('entertainment');
  const [nextPaymentDate, setNextPaymentDate] = useState('');

  // Walidacja
  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const isValid = name.trim().length > 0 && !isNaN(parsedAmount) && parsedAmount > 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // ── Formatowanie daty ────────────────────────────────────────
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0]; // "2026-04-24"
  const formattedDate = today.toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  // ── Zapis ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isValid || createSubscription.isPending) return;

    const payload: CreateSubscriptionPayload = {
      name: name.trim(),
      amount: parsedAmount,
      currency: 'PLN',
      category,
      billingCycle: cycle,
      ...(provider.trim() && { provider: provider.trim() }),
      // Używamy podanej daty lub dzisiaj
      nextPaymentDate: nextPaymentDate || todayISO,
    };

    createSubscription.mutate(payload, {
      onSuccess: () => {
        navigation.goBack(); // Cache jest już invalidowany przez hook
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          if (error.status === 409) {
            // Duplikat
            const body = error.body as any;
            Alert.alert(
              'Podobna subskrypcja istnieje',
              `"${body?.duplicate?.name ?? name}" jest już na Twojej liście (status: ${body?.duplicate?.status}).`,
              [
                { text: 'Zapisz mimo to', onPress: () => navigation.goBack() },
                { text: 'Wróć', style: 'cancel' },
              ]
            );
          } else if (error.status === 400) {
            // Błąd walidacji
            const body = error.body as any;
            const firstError = body?.errors?.[0];
            Alert.alert(
              'Błąd walidacji',
              firstError
                ? `${firstError.field}: ${firstError.message}`
                : error.message
            );
          } else {
            Alert.alert('Błąd', error.message || 'Spróbuj ponownie.');
          }
        } else {
          Alert.alert('Błąd', 'Sprawdź połączenie z internetem.');
        }
      },
    });
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>

            {/* HEADER */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Nowa Subskrypcja</Text>

              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleSave}
                disabled={!isValid || createSubscription.isPending}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {createSubscription.isPending ? (
                  <ActivityIndicator size="small" color="#6366F1" />
                ) : (
                  <Text style={[styles.saveButtonText, !isValid && styles.saveButtonDisabled]}>
                    Zapisz
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* HERO INPUT — kwota */}
              <View style={styles.heroSection}>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    ref={amountInputRef}
                    style={styles.amountInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#CBD5E1"
                    value={amount}
                    onChangeText={(text) => {
                      const formatted = text.replace(/[^0-9.,]/g, '');
                      setAmount(formatted);
                    }}
                    maxLength={8}
                  />
                  <Text style={styles.currencyText}>PLN</Text>
                </View>
              </View>

              {/* FORM */}
              <View style={styles.formSection}>

                {/* NAZWA */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nazwa usługi *</Text>
                  <View style={styles.textInputWrapper}>
                    <Edit2 size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="np. Netflix, Karnet na siłownię"
                      placeholderTextColor="#94A3B8"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                {/* PROVIDER (opcjonalne) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Dostawca (opcjonalnie)</Text>
                  <View style={styles.textInputWrapper}>
                    <Edit2 size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="np. Netflix, Spotify, Google"
                      placeholderTextColor="#94A3B8"
                      value={provider}
                      onChangeText={setProvider}
                    />
                  </View>
                </View>

                {/* CYKL ROZLICZENIOWY */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <RotateCw size={16} color="#64748B" />
                    <Text style={[styles.label, { marginBottom: 0, marginLeft: 6 }]}>Cykl rozliczeniowy</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                  >
                    {CYCLES.map(c => {
                      const isActive = cycle === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          activeOpacity={0.8}
                          onPress={() => setCycle(c.id)}
                          style={[styles.pill, isActive && styles.pillActive]}
                        >
                          <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                            {c.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* DATA NASTĘPNEJ PŁATNOŚCI */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Następna płatność</Text>
                  <TouchableOpacity style={styles.dateMockButton} activeOpacity={0.7}>
                    <Calendar size={20} color="#6366F1" style={styles.inputIcon} />
                    <Text style={styles.dateMockText}>{formattedDate}</Text>
                  </TouchableOpacity>
                </View>

                {/* KATEGORIA */}
                <View style={[styles.inputGroup, { borderBottomWidth: 0 }]}>
                  <View style={styles.labelRow}>
                    <LayoutGrid size={16} color="#64748B" />
                    <Text style={[styles.label, { marginBottom: 0, marginLeft: 6 }]}>Kategoria</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                  >
                    {CATEGORIES.map(cat => {
                      const isActive = category === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          activeOpacity={0.8}
                          onPress={() => setCategory(cat.id)}
                          style={[
                            styles.categoryPill,
                            { backgroundColor: cat.color },
                            isActive && { borderWidth: 2, borderColor: cat.textColor },
                          ]}
                        >
                          <Text style={[styles.categoryText, { color: cat.textColor }]}>
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  inner: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#F8FAFC',
  },
  headerButton: { minWidth: 60, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#0F172A' },
  saveButtonText: { color: '#6366F1', fontSize: 16, fontWeight: '700', textAlign: 'right' },
  saveButtonDisabled: { color: '#94A3B8', fontWeight: '500' },
  scrollContent: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  amountInput: {
    fontSize: 56, fontWeight: '800', color: '#0F172A',
    textAlign: 'center', minWidth: 120,
  },
  currencyText: { fontSize: 24, fontWeight: '600', color: '#64748B', marginLeft: 8, marginTop: 16 },
  formSection: {
    backgroundColor: '#FFFFFF', borderRadius: 24, marginHorizontal: 16,
    paddingHorizontal: 20, paddingVertical: 8,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 4,
  },
  inputGroup: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  label: {
    fontSize: 13, fontWeight: '600', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  textInputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 12, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#E2E8F0',
  },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '500' },
  categoryScroll: { gap: 8, paddingVertical: 4 },
  pill: {
    paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#F8FAFC',
    borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0',
  },
  pillActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  pillText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '600' },
  dateMockButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF',
    borderRadius: 12, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#E0E7FF',
  },
  dateMockText: { fontSize: 16, color: '#4F46E5', fontWeight: '600' },
  categoryPill: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 2, borderColor: 'transparent',
  },
  categoryText: { fontSize: 14, fontWeight: '600' },
});

export default ManualAddScreen;
