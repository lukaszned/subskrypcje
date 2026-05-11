// =============================================================
// src/screens/ManualAddScreen.tsx
//
// Formularz dodawania/edycji subskrypcji.
// =============================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, Edit2, Calendar, LayoutGrid, RotateCw, Banknote, 
  Film, Wifi, Heart, GraduationCap, Briefcase, ShoppingBag, 
  PiggyBank, Truck, Globe, AlertCircle, ArrowRight 
} from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';

// Hooks
import { useCreateSubscription } from '../hooks/useCreateSubscription';
import { useUpdateSubscription } from '../hooks/useUpdateSubscription';
import { useSubscription } from '../hooks/useSubscription';
import { useSubscriptionPlans } from '../hooks/useSubscriptionPlans';
import type { PopularSubscription } from '../data/subscriptionPlans';
import { SubscriptionCategory, BillingCycle } from '../types/api';
import { ApiError } from '../lib/apiClient';
import { vibrantTheme } from '../theme/vibrantTheme';
import { formatInputDate, parseAppDate } from '../utils/date';

const CATEGORIES: Array<{
  id: SubscriptionCategory;
  label: string;
  color: string;
  textColor: string;
  icon: any;
}> = [
  { id: 'entertainment', label: 'Rozrywka',      color: '#E8F3EC', textColor: '#0B6B3A', icon: Film },
  { id: 'utilities',     label: 'Narzędzia',     color: '#DBEAFE', textColor: '#2563EB', icon: Wifi },
  { id: 'health',        label: 'Zdrowie',        color: '#DCFCE7', textColor: '#16A34A', icon: Heart },
  { id: 'education',     label: 'Edukacja',       color: '#FEF9C3', textColor: '#CA8A04', icon: GraduationCap },
  { id: 'productivity',  label: 'Produktywność',  color: '#FCE7F3', textColor: '#BE185D', icon: Briefcase },
  { id: 'shopping',      label: 'Zakupy',         color: '#FEF3C7', textColor: '#D97706', icon: ShoppingBag },
  { id: 'finance',       label: 'Finanse',        color: '#ECFDF5', textColor: '#059669', icon: PiggyBank },
  { id: 'transport',     label: 'Transport',      color: '#F0F9FF', textColor: '#0284C7', icon: Truck },
  { id: 'other',         label: 'Inne',           color: '#F1F5F9', textColor: '#64748B', icon: Globe },
];

const CYCLES: Array<{ id: BillingCycle; label: string }> = [
  { id: 'monthly',  label: 'Co miesiąc' },
  { id: 'yearly',   label: 'Co rok'     },
  { id: 'weekly',   label: 'Co tydzień' },
  { id: 'one_time', label: 'Jednorazowo'},
];

export const ManualAddScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'AddSubscription'>>();
  const route = useRoute<RouteProp<AppStackParamList, 'AddSubscription'>>();
  const subscriptionId = route.params?.subscriptionId;

  const amountInputRef = useRef<TextInput>(null);
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const { data: existingSub, isLoading: isLoadingSub } = useSubscription(subscriptionId || '');
  const { data: subscriptionPlans = [], isFetching: isPlansRefreshing } = useSubscriptionPlans();

  // Form State
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [planName, setPlanName] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState<SubscriptionCategory>('entertainment');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currency, setCurrency] = useState('PLN');
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState(new Date());
  const [showTrialPicker, setShowTrialPicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [cancelUrl, setCancelUrl] = useState('');

  const [selectedService, setSelectedService] = useState<PopularSubscription | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [peopleCount, setPeopleCount] = useState(2);
  const [includeInStats, setIncludeInStats] = useState(true);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const finalCalculatedCost = useMemo(() => {
    if (isNaN(parsedAmount)) return 0;
    if (isShared && peopleCount > 0) return parsedAmount / peopleCount;
    return parsedAmount;
  }, [parsedAmount, isShared, peopleCount]);

  const [isSubmitted, setIsSubmitted] = useState(false);

  // Suggestions logic
  const filteredSuggestions = useMemo(() => {
    let list = subscriptionPlans;
    if (name.trim()) {
      list = subscriptionPlans.filter(s =>
        s.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    // Sort alphabetically
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [name, subscriptionPlans]);

  const handleSelectPopular = (service: PopularSubscription) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedService?.name === service.name) {
      setSelectedService(null);
      setName('');
      setAmount('');
      setCategory('entertainment');
      setProvider('');
      setCurrency('PLN');
      setPlanName('');
    } else {
      setSelectedService(service);
      setName(service.name);
      setAmount(service.defaultPrice);
      setCategory(service.category);
      setProvider(service.provider);
      setPlanName(service.availablePlans?.find((plan) => plan.price.toFixed(2) === Number(service.defaultPrice).toFixed(2))?.name || '');
      if (service.name.includes('ChatGPT')) setCurrency('USD');
      else setCurrency('PLN');
    }
    
    Keyboard.dismiss();
  };

  const isValid = name.trim().length > 0 && !isNaN(parsedAmount) && parsedAmount > 0;

  useEffect(() => {
    if (existingSub) {
      setAmount(existingSub.amount.toString());
      setName(existingSub.name);
      setProvider(existingSub.provider || '');
      setPlanName(existingSub.planName || '');
      setCycle(existingSub.billingCycle);
      setCategory(existingSub.category);
      setCurrency(existingSub.currency || 'PLN');
      setIsTrial(existingSub.isTrial);
      setCancelUrl(existingSub.cancelUrl || '');

      let parsedText = existingSub.notes || '';
      try {
        if (existingSub.notes?.startsWith('{')) {
          const parsed = JSON.parse(existingSub.notes);
          if (parsed.text !== undefined) parsedText = parsed.text;
          if (parsed.isShared !== undefined) setIsShared(parsed.isShared);
          if (parsed.peopleCount !== undefined) setPeopleCount(parsed.peopleCount);
          if (parsed.includeInStats !== undefined) setIncludeInStats(parsed.includeInStats);
          
          if (parsed.isShared && parsed.peopleCount && existingSub.amount) {
            setAmount((existingSub.amount * parsed.peopleCount).toString());
          }
        }
      } catch (e) {
        // Not a JSON string
      }
      setNotes(parsedText);
      setCancelUrl(existingSub.cancelUrl || '');
      if (existingSub.nextPaymentDate) {
        setDate(parseAppDate(existingSub.nextPaymentDate) || new Date());
      }
      if (existingSub.trialEndDate) {
        setTrialEndDate(parseAppDate(existingSub.trialEndDate) || new Date());
      }
    }
  }, [existingSub]);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onTrialDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTrialPicker(false);
    if (selectedDate) setTrialEndDate(selectedDate);
  };

  const formatDate = (d: Date) => {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  const handleSave = async () => {
    setIsSubmitted(true);
    if (!isValid || createMutation.isPending || updateMutation.isPending) return;

    const notesPayload = JSON.stringify({
      text: notes.trim(),
      isShared,
      peopleCount: isShared ? peopleCount : undefined,
      includeInStats,
    });

    const payload = {
      name: name.trim(),
      amount: finalCalculatedCost,
      currency,
      category,
      billingCycle: cycle,
      provider: provider.trim() || undefined,
      planName: planName.trim() || undefined,
      nextPaymentDate: formatInputDate(date),
      isTrial,
      trialEndDate: isTrial ? formatInputDate(trialEndDate) : undefined,
      notes: notesPayload,
      cancelUrl: cancelUrl.trim() || undefined,
      reminderDaysBefore: 1,
    };

    if (subscriptionId) {
      updateMutation.mutate({ id: subscriptionId, payload }, {
        onSuccess: () => {
          Alert.alert('Sukces', 'Subskrypcja została zaktualizowana.');
          navigation.goBack();
        },
        onError: handleApiError,
      });
    } else {
      createMutation.mutate(payload as any, {
        onSuccess: () => {
          Alert.alert('Sukces', 'Dodano nową subskrypcję!');
          navigation.goBack();
        },
        onError: handleApiError,
      });
    }
  };

  const handleApiError = (error: any) => {
    console.error('Błąd zapisu:', error);
    
    if (error instanceof ApiError) {
      if (error.status === 409) {
        Alert.alert('Duplikat', 'Subskrypcja o tej nazwie już istnieje.');
      } else if (error.status === 400 && error.body) {
        const body = error.body as any;
        const details = body.errors?.map((e: any) => `- ${e.message}`).join('\n') || error.message;
        Alert.alert('Błąd walidacji', details);
      } else {
        Alert.alert('Błąd', error.message || 'Nie udało się zapisać subskrypcji.');
      }
    } else {
      Alert.alert('Błąd połączenia', 'Upewnij się, że serwer działa i telefon jest w tej samej sieci Wi-Fi.');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

    const scrollViewRef = useRef<ScrollView>(null);
  
    const scrollToForm = () => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 150, animated: true });
      }
    };
  
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
              <View style={styles.header}>
                <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.goBack()}><X size={22} color="#14251B" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{subscriptionId ? 'Edytuj' : 'Nowa'}</Text>
                <View style={styles.headerIconButton} />
              </View>
  
              <ScrollView 
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
              <View style={styles.amountHeader}>
                <Text style={styles.amountLabel}>Miesięczny koszt</Text>
                
                {selectedService?.availablePlans && selectedService.availablePlans.length > 0 ? (
                  <View style={styles.planSelectionContainer}>
                    <View style={styles.planSelectionHeader}>
                      <Text style={styles.planSelectionTitle}>Wybierz plan dla {selectedService.name}</Text>
                      <TouchableOpacity 
                        style={styles.planBackButton}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setSelectedService(null);
                          setAmount('');
                          setPlanName('');
                        }}
                      >
                        <Text style={styles.planBackButtonText}>Wpisz ręcznie</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      contentContainerStyle={styles.plansScrollContent}
                    >
                      {selectedService.availablePlans.map((plan) => {
                        const isActivePlan = planName === plan.name && parsedAmount === plan.price;
                        return (
                        <TouchableOpacity
                          key={`${plan.name}-${plan.price}`}
                          style={[
                            styles.planCard,
                            isActivePlan && styles.planCardActive
                          ]}
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setAmount(plan.price.toString());
                            setPlanName(plan.name);
                            if (plan.billingCycle) setCycle(plan.billingCycle);
                            scrollToForm();
                          }}
                        >
                          <Text style={[styles.planCardName, isActivePlan && styles.planCardNameActive]} numberOfLines={1}>
                            {plan.name}
                          </Text>
                          <View style={styles.planCardPriceRow}>
                            <Text style={[styles.planCardPrice, isActivePlan && styles.planCardPriceActive]}>
                              {plan.price.toFixed(2)}
                            </Text>
                            <Text style={[styles.planCardCurrency, isActivePlan && styles.planCardCurrencyActive]}>
                              {currency}
                            </Text>
                          </View>
                          <Text style={[styles.planCardCycle, isActivePlan && styles.planCardCycleActive]}>
                            {plan.billingCycle === 'yearly' ? 'Rocznie' : 'Miesięcznie'}
                          </Text>
                        </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    
                    {parsedAmount > 0 && (
                      <TouchableOpacity 
                        style={styles.planConfirmButton}
                        onPress={() => {
                          // Action to "go further"
                          Keyboard.dismiss();
                          scrollToForm();
                        }}
                      >
                        <Text style={styles.planConfirmButtonText}>Kontynuuj z tym planem</Text>
                        <ArrowRight size={16} color="#0B6B3A" />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.amountRow}>
                    <TextInput
                      style={[styles.amountInput, isSubmitted && parsedAmount <= 0 && { color: '#FECACA' }]}
                      value={amount}
                      onChangeText={(value) => {
                        setAmount(value);
                        setPlanName('');
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                    <Text style={styles.currencyLabel}>{currency}</Text>
                  </View>
                )}
                
                {!selectedService?.availablePlans && (
                  <View style={styles.currencyPills}>
                    {['PLN', 'USD', 'EUR', 'GBP'].map(c => (
                      <TouchableOpacity 
                        key={c} 
                        style={[styles.currencyPill, currency === c && styles.currencyPillActive]}
                        onPress={() => setCurrency(c)}
                      >
                        <Text style={[styles.currencyPillText, currency === c && styles.currencyPillTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <View style={[styles.infoBox, { marginBottom: 20 }]}>
                  <AlertCircle size={16} color="#0B6B3A" style={{ marginRight: 8 }} />
                  <Text style={styles.infoBoxText}>
                    Wystarczy nazwa, koszt, cykl i data płatności. Resztę możesz uzupełnić później.
                  </Text>
                </View>

                <View style={styles.formCard}>
                  <View style={styles.sectionHeaderBlock}>
                    <Text style={styles.sectionHeaderTitle}>Wybór usługi</Text>
                    <Text style={styles.sectionHeaderHint}>
                      {isPlansRefreshing ? 'Odświeżam katalog planów...' : 'Kafelki marek i podstawowe dane'}
                    </Text>
                  </View>

                <View style={styles.inputGroup}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>Nazwa</Text>
                    {filteredSuggestions.length > 0 && (
                      <Text style={[styles.label, { color: '#0B6B3A' }]}>Sugestie</Text>
                    )}
                  </View>
                  
                  {filteredSuggestions.length > 0 && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      style={styles.suggestionsScroll}
                      contentContainerStyle={styles.suggestionsContent}
                    >
                      {filteredSuggestions.map((s) => (
                        <TouchableOpacity 
                          key={s.name} 
                          style={styles.suggestionChip}
                          onPress={() => handleSelectPopular(s)}
                        >
                          <View style={[styles.suggestionIcon, { backgroundColor: s.color }]}>
                            <Text style={styles.suggestionIconText}>{s.name.charAt(0)}</Text>
                          </View>
                          <Text style={styles.suggestionText}>{s.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  <TextInput 
                    style={[styles.textInput, isSubmitted && name.trim().length === 0 && { borderWidth: 1, borderColor: '#EF4444' }]} 
                    value={name} 
                    onChangeText={(val) => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setName(val);
                    }} 
                    placeholder="np. Netflix" 
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.labelOptional}>Dostawca</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={provider} 
                    onChangeText={setProvider} 
                    placeholder="np. Google, Apple" 
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                </View>

                <View style={styles.formCard}>
                  <View style={styles.sectionHeaderBlock}>
                    <Text style={styles.sectionHeaderTitle}>Szczegóły kosztów</Text>
                    <Text style={styles.sectionHeaderHint}>Plan, cykl, data, kategoria i współdzielenie</Text>
                  </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Cykl</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {CYCLES.map(c => (
                      <TouchableOpacity 
                        key={c.id} 
                        style={[styles.pill, cycle === c.id && styles.pillActive]}
                        onPress={() => setCycle(c.id)}
                      >
                        <Text style={[styles.pillText, cycle === c.id && styles.pillTextActive]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Następna płatność</Text>
                  <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                    <Calendar size={20} color="#0B6B3A" style={{ marginRight: 8 }} />
                    <Text style={styles.dateText}>{formatDate(date)}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onDateChange}
                    />
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Kategoria</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity 
                        key={cat.id} 
                        style={[styles.catPill, category === cat.id && { borderColor: cat.textColor, borderWidth: 2 }]}
                        onPress={() => setCategory(cat.id)}
                      >
                        <cat.icon size={16} color={cat.textColor} />
                        <Text style={[styles.catText, { color: cat.textColor }]}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.labelOptional}>Trial</Text>
                    <TouchableOpacity 
                      onPress={() => setIsTrial(!isTrial)}
                      style={[styles.toggle, isTrial && styles.toggleActive]}
                    >
                      <View style={[styles.toggleDot, isTrial && styles.toggleDotActive]} />
                    </TouchableOpacity>
                  </View>
                </View>

                {isTrial && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Koniec triala</Text>
                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowTrialPicker(true)}>
                      <Calendar size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                      <Text style={[styles.dateText, { color: '#F59E0B' }]}>{formatDate(trialEndDate)}</Text>
                    </TouchableOpacity>
                    {showTrialPicker && (
                      <DateTimePicker
                        value={trialEndDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onTrialDateChange}
                      />
                    )}
                  </View>
                )}

                <View style={styles.optionalGroup}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.labelOptional}>Współdzielenie</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsShared(!isShared);
                      }}
                      style={[styles.toggle, isShared && styles.toggleActive]}
                    >
                      <View style={[styles.toggleDot, isShared && styles.toggleDotActive]} />
                    </TouchableOpacity>
                  </View>
                  
                  {isShared && (
                    <View style={{ marginTop: 16, backgroundColor: 'rgba(255,255,255,0.07)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: vibrantTheme.colors.border }}>
                      <Text style={[styles.labelOptional, { marginBottom: 12 }]}>Liczba osób</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                        <TouchableOpacity 
                          style={styles.stepperBtn}
                          onPress={() => setPeopleCount(Math.max(2, peopleCount - 1))}
                        >
                          <Text style={styles.stepperBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: vibrantTheme.colors.text, minWidth: 40, textAlign: 'center' }}>{peopleCount}</Text>
                        <TouchableOpacity 
                          style={styles.stepperBtn}
                          onPress={() => setPeopleCount(peopleCount + 1)}
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  
                  {isShared && parsedAmount > 0 && (
                    <View style={{ marginTop: 12, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0B6B3A' }}>
                        Twój koszt: {finalCalculatedCost.toFixed(2)} {currency}
                      </Text>
                    </View>
                  )}
                </View>

                </View>

                <View style={styles.formCard}>
                  <View style={styles.sectionHeaderBlock}>
                    <Text style={styles.sectionHeaderTitle}>Opcje dodatkowe</Text>
                    <Text style={styles.sectionHeaderHint}>Anulowanie, notatki i statystyki</Text>
                  </View>

                <View style={styles.optionalGroup}>
                  <Text style={styles.labelOptional}>Link do anulowania</Text>
                  <TextInput
                    style={styles.textInput}
                    value={cancelUrl}
                    onChangeText={setCancelUrl}
                    placeholder="https://..."
                    placeholderTextColor={vibrantTheme.colors.textSubtle}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.optionalGroup}>
                  <Text style={styles.labelOptional}>Notatki</Text>
                  <TextInput
                    style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Wpisz dodatkowe informacje..."
                    placeholderTextColor={vibrantTheme.colors.textSubtle}
                    multiline
                  />
                </View>

                <View style={styles.optionalGroup}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.labelOptional}>Uwzględnij w statystykach</Text>
                    <TouchableOpacity 
                      onPress={() => setIncludeInStats(!includeInStats)}
                      style={[styles.toggle, includeInStats && styles.toggleActive]}
                    >
                      <View style={[styles.toggleDot, includeInStats && styles.toggleDotActive]} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.infoBoxText, { marginTop: 8, color: vibrantTheme.colors.textMuted }]}>
                    Po wyłączeniu koszt tej usługi nie będzie doliczany do podsumowań i trendów subskrypcji.
                  </Text>
                </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, isLoading && styles.saveButtonLoading]}
                  onPress={handleSave}
                  disabled={isLoading || !isValid}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.saveButtonText}>Zapisz subskrypcję</Text>
                      <ArrowRight size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  container: { flex: 1 },
  inner: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerIconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: vibrantTheme.colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  headerTitle: { fontSize: 22, fontWeight: '900', color: vibrantTheme.colors.text },
  scrollContent: { paddingBottom: 44, flexGrow: 1, paddingHorizontal: 16 },
  amountHeader: {
    backgroundColor: vibrantTheme.colors.cardStrong,
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 28,
    marginBottom: 16,
    shadowColor: vibrantTheme.colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 8,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.borderStrong,
  },
  amountLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amountInput: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'right',
    minWidth: 100,
  },
  currencyLabel: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 8,
    opacity: 0.8,
  },
  currencyPills: { flexDirection: 'row', gap: 8, marginTop: 20 },
  currencyPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  currencyPillActive: { backgroundColor: vibrantTheme.colors.primary },
  currencyPillText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  currencyPillTextActive: { color: vibrantTheme.colors.darkText },
  formSection: { margin: 0 },
  formCard: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 5,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  inputGroup: {
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  optionalGroup: {
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  sectionHeaderBlock: {
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: vibrantTheme.colors.text,
  },
  sectionHeaderHint: {
    marginTop: 3,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  label: { fontSize: 12, fontWeight: '800', color: vibrantTheme.colors.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  labelOptional: { fontSize: 12, fontWeight: '800', color: vibrantTheme.colors.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  textInput: { fontSize: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: vibrantTheme.colors.text, fontWeight: '700', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', marginRight: 8, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  pillActive: { backgroundColor: 'rgba(32,246,181,0.16)', borderColor: vibrantTheme.colors.primary },
  pillText: { color: vibrantTheme.colors.textMuted, fontWeight: '700' },
  pillTextActive: { color: vibrantTheme.colors.primary },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  dateText: { fontSize: 16, fontWeight: '700', color: vibrantTheme.colors.primary },
  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  catText: { marginLeft: 6, fontWeight: '700', fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { width: 52, height: 30, borderRadius: 15, backgroundColor: '#DDE6DF', padding: 3 },
  toggleActive: { backgroundColor: vibrantTheme.colors.primary },
  toggleDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  toggleDotActive: { transform: [{ translateX: 22 }] },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(32,246,181,0.13)',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: vibrantTheme.colors.primary,
    fontWeight: '500',
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: vibrantTheme.colors.primary,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    shadowColor: vibrantTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  saveButtonLoading: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: vibrantTheme.colors.darkText,
    fontSize: 17,
    fontWeight: '800',
  },
  suggestionsScroll: {
    marginBottom: 12,
    marginLeft: -4,
  },
  suggestionsContent: {
    paddingRight: 20,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E6ECE4',
  },
  suggestionIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  suggestionIconText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14251B',
  },
  planSelectionContainer: {
    width: '100%',
    paddingVertical: 10,
  },
  planSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  planSelectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  planBackButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBackButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  plansScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 10,
  },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    borderRadius: 20,
    minWidth: 110,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  planCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.05 }],
  },
  planCardName: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    maxWidth: 100,
  },
  planCardNameActive: {
    color: '#0B6B3A',
  },
  planCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  planCardPrice: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  planCardPriceActive: {
    color: '#0B6B3A',
  },
  planCardCurrency: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  planCardCurrencyActive: {
    color: '#0B6B3A',
    opacity: 0.7,
  },
  planCardCycle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planCardCycleActive: {
    color: '#64748B',
  },
  planConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 40,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  planConfirmButtonText: {
    color: '#0B6B3A',
    fontSize: 14,
    fontWeight: '700',
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 28,
  },
});

export default ManualAddScreen;
