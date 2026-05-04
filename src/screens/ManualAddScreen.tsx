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
import { SubscriptionCategory, BillingCycle } from '../types/api';
import { ApiError } from '../lib/apiClient';

const CATEGORIES: Array<{
  id: SubscriptionCategory;
  label: string;
  color: string;
  textColor: string;
  icon: any;
}> = [
  { id: 'entertainment', label: 'Rozrywka',      color: '#E0E7FF', textColor: '#4F46E5', icon: Film },
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

interface PopularSubscription {
  name: string;
  defaultPrice: string;
  category: SubscriptionCategory;
  color: string;
  provider: string;
  availablePlans?: number[];
}

const POPULAR_SUBSCRIPTIONS: PopularSubscription[] = [
  { name: 'Netflix', defaultPrice: '43.00', category: 'entertainment', color: '#E50914', provider: 'Netflix', availablePlans: [29, 43, 60] },
  { name: 'Spotify', defaultPrice: '24.99', category: 'entertainment', color: '#1DB954', provider: 'Spotify', availablePlans: [24.99, 32.99] },
  { name: 'YouTube Premium', defaultPrice: '25.99', category: 'entertainment', color: '#FF0000', provider: 'Google', availablePlans: [25.99, 46.99] },
  { name: 'Disney+', defaultPrice: '37.99', category: 'entertainment', color: '#006E99', provider: 'Disney', availablePlans: [37.99, 379.90] },
  { name: 'HBO Max', defaultPrice: '29.99', category: 'entertainment', color: '#5822B4', provider: 'Warner Bros' },
  { name: 'Amazon Prime', defaultPrice: '10.99', category: 'entertainment', color: '#FF9900', provider: 'Amazon', availablePlans: [10.99, 49.00] },
  { name: 'Apple Music', defaultPrice: '21.99', category: 'entertainment', color: '#FA243C', provider: 'Apple' },
  { name: 'Apple TV+', defaultPrice: '34.99', category: 'entertainment', color: '#000000', provider: 'Apple', availablePlans: [34.99, 349.90] },
  { name: 'Canva', defaultPrice: '49.99', category: 'productivity', color: '#00C4CC', provider: 'Canva', availablePlans: [49.99, 64.99] },
  { name: 'Xbox Game Pass', defaultPrice: '42.99', category: 'entertainment', color: '#107C10', provider: 'Microsoft', availablePlans: [40.00, 42.99, 62.99] },
  { name: 'Allegro Smart!', defaultPrice: '10.99', category: 'shopping', color: '#FF5A00', provider: 'Allegro', availablePlans: [10.99, 59.90] },
  { name: 'Strava', defaultPrice: '32.99', category: 'health', color: '#FC4C02', provider: 'Strava', availablePlans: [32.99, 249.99] },
  { name: 'iCloud+', defaultPrice: '3.99', category: 'utilities', color: '#007AFF', provider: 'Apple', availablePlans: [3.99, 14.99, 49.99] },
  { name: 'ChatGPT Plus', defaultPrice: '20.00', category: 'productivity', color: '#10A37F', provider: 'OpenAI' },
  { name: 'PlayStation Plus', defaultPrice: '37.00', category: 'entertainment', color: '#003087', provider: 'Sony', availablePlans: [37, 58, 70] },
];

export const ManualAddScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'AddSubscription'>>();
  const route = useRoute<RouteProp<AppStackParamList, 'AddSubscription'>>();
  const subscriptionId = route.params?.subscriptionId;

  const amountInputRef = useRef<TextInput>(null);
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const { data: existingSub, isLoading: isLoadingSub } = useSubscription(subscriptionId || '');

  // Form State
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
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
    let list = POPULAR_SUBSCRIPTIONS;
    if (name.trim()) {
      list = POPULAR_SUBSCRIPTIONS.filter(s => 
        s.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    // Sort alphabetically
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [name]);

  const handleSelectPopular = (service: PopularSubscription) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedService?.name === service.name) {
      setSelectedService(null);
      setName('');
      setAmount('');
      setCategory('entertainment');
      setProvider('');
      setCurrency('PLN');
    } else {
      setSelectedService(service);
      setName(service.name);
      setAmount(service.defaultPrice);
      setCategory(service.category);
      setProvider(service.provider);
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
        setDate(new Date(existingSub.nextPaymentDate));
      }
      if (existingSub.trialEndDate) {
        setTrialEndDate(new Date(existingSub.trialEndDate));
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
      nextPaymentDate: date.toISOString().split('T')[0],
      isTrial,
      trialEndDate: isTrial ? trialEndDate.toISOString().split('T')[0] : undefined,
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
                <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color="#64748B" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{subscriptionId ? 'Edytuj' : 'Nowa'}</Text>
                <View style={{ width: 24 }} />
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
                      {selectedService.availablePlans.map((planPrice) => (
                        <TouchableOpacity
                          key={planPrice}
                          style={[
                            styles.planCard,
                            parsedAmount === planPrice && styles.planCardActive
                          ]}
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setAmount(planPrice.toString());
                            // Proceed further: scroll to form
                            scrollToForm();
                          }}
                        >
                          <View style={styles.planCardPriceRow}>
                            <Text style={[styles.planCardPrice, parsedAmount === planPrice && styles.planCardPriceActive]}>
                              {planPrice.toFixed(2)}
                            </Text>
                            <Text style={[styles.planCardCurrency, parsedAmount === planPrice && styles.planCardCurrencyActive]}>
                              {currency}
                            </Text>
                          </View>
                          <Text style={[styles.planCardCycle, parsedAmount === planPrice && styles.planCardCycleActive]}>
                            Miesięcznie
                          </Text>
                        </TouchableOpacity>
                      ))}
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
                        <ArrowRight size={16} color="#6366F1" />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.amountRow}>
                    <TextInput
                      style={[styles.amountInput, isSubmitted && parsedAmount <= 0 && { color: '#FECACA' }]}
                      value={amount}
                      onChangeText={setAmount}
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
                  <AlertCircle size={16} color="#6366F1" style={{ marginRight: 8 }} />
                  <Text style={styles.infoBoxText}>
                    Wystarczy nazwa, koszt, cykl i data płatności. Resztę możesz uzupełnić później.
                  </Text>
                </View>

                <View style={styles.sectionHeaderBlock}>
                  <Text style={styles.sectionHeaderTitle}>Podstawowe</Text>
                  <Text style={styles.sectionHeaderHint}>Najważniejsze dane subskrypcji</Text>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>Nazwa</Text>
                    {filteredSuggestions.length > 0 && (
                      <Text style={[styles.label, { color: '#6366F1' }]}>Sugestie</Text>
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
                    <Calendar size={20} color="#6366F1" style={{ marginRight: 8 }} />
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

                <View style={styles.sectionHeaderBlock}>
                  <Text style={styles.sectionHeaderTitle}>Opcjonalne</Text>
                  <Text style={styles.sectionHeaderHint}>Ułatwiają anulowanie i dokładniejsze statystyki</Text>
                </View>

                <View style={styles.optionalGroup}>
                  <Text style={styles.labelOptional}>Link do anulowania</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={cancelUrl} 
                    onChangeText={setCancelUrl} 
                    placeholder="https://..." 
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
                    multiline
                  />
                </View>

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
                    <View style={{ marginTop: 16, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16 }}>
                      <Text style={[styles.labelOptional, { marginBottom: 12 }]}>Liczba osób</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                        <TouchableOpacity 
                          style={styles.stepperBtn}
                          onPress={() => setPeopleCount(Math.max(2, peopleCount - 1))}
                        >
                          <Text style={styles.stepperBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A', minWidth: 40, textAlign: 'center' }}>{peopleCount}</Text>
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
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#10B981' }}>
                        Twój koszt: {finalCalculatedCost.toFixed(2)} {currency}
                      </Text>
                    </View>
                  )}
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
                  <Text style={[styles.infoBoxText, { marginTop: 8, color: '#64748B' }]}>
                    Po wyłączeniu koszt tej usługi nie będzie doliczany do podsumowań i trendów subskrypcji.
                  </Text>
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
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  inner: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingBottom: 40, flexGrow: 1 },
  amountHeader: {
    backgroundColor: '#6366F1',
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
  currencyPillActive: { backgroundColor: '#FFFFFF' },
  currencyPillText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  currencyPillTextActive: { color: '#6366F1' },
  formSection: { backgroundColor: '#FFFFFF', margin: 16, borderRadius: 24, padding: 20 },
  inputGroup: { marginBottom: 24 },
  optionalGroup: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeaderBlock: {
    marginBottom: 18,
    paddingTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHeaderHint: {
    marginTop: 3,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  label: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12 },
  labelOptional: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 12 },
  textInput: { fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFC', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  pillActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  pillText: { color: '#64748B', fontWeight: '600' },
  pillTextActive: { color: '#FFFFFF' },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  dateText: { fontSize: 16, fontWeight: '600', color: '#4F46E5' },
  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#F8FAFC' },
  catText: { marginLeft: 6, fontWeight: '700', fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', padding: 2 },
  toggleActive: { backgroundColor: '#10B981' },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  toggleDotActive: { transform: [{ translateX: 20 }] },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonLoading: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#334155',
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
    color: '#6366F1',
  },
  planCardCurrency: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  planCardCurrencyActive: {
    color: '#6366F1',
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
    color: '#6366F1',
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
