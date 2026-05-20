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
  Animated,
  Easing,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  X, Edit2, Calendar, LayoutGrid, RotateCw, Banknote, ChevronDown,
  Film, Wifi, Heart, GraduationCap, Briefcase, ShoppingBag, 
  PiggyBank, Truck, Globe, AlertCircle, ArrowRight, ShieldCheck, Sparkles, Wand2
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
import { useTheme } from '../theme/ThemeContext';
import { formatInputDate, parseAppDate } from '../utils/date';
import { isTimeoutLikeError } from '../utils/requestErrors';
import { fetchEstimatedCost, type EstimatedCostPlan } from '../services/aiPricePredictor';

const CATEGORIES: Array<{
  id: SubscriptionCategory;
  label: string;
  color: string;
  textColor: string;
  icon: any;
}> = [
  { id: 'entertainment', label: 'Rozrywka',      color: '#F1F5F9', textColor: '#334155', icon: Film },
  { id: 'utilities',     label: 'Narzędzia',     color: '#DBEAFE', textColor: '#2563EB', icon: Wifi },
  { id: 'health',        label: 'Zdrowie',        color: '#F1F5F9', textColor: '#334155', icon: Heart },
  { id: 'education',     label: 'Edukacja',       color: '#FEF9C3', textColor: '#CA8A04', icon: GraduationCap },
  { id: 'productivity',  label: 'Produktywność',  color: '#FCE7F3', textColor: '#BE185D', icon: Briefcase },
  { id: 'shopping',      label: 'Zakupy',         color: '#FEF3C7', textColor: '#D97706', icon: ShoppingBag },
  { id: 'finance',       label: 'Finanse',        color: '#F8FAFC', textColor: '#334155', icon: PiggyBank },
  { id: 'transport',     label: 'Transport',      color: '#F0F9FF', textColor: '#0284C7', icon: Truck },
  { id: 'other',         label: 'Inne',           color: '#F1F5F9', textColor: '#64748B', icon: Globe },
];

const CYCLES: Array<{ id: BillingCycle; label: string }> = [
  { id: 'monthly',  label: 'Co miesiąc' },
  { id: 'yearly',   label: 'Co rok'     },
  { id: 'weekly',   label: 'Co tydzień' },
  { id: 'one_time', label: 'Jednorazowo'},
];

const addMonthsClamped = (baseDate: Date, monthsToAdd: number) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth() + monthsToAdd;
  const day = baseDate.getDate();
  const lastDayInTargetMonth = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(day, lastDayInTargetMonth));
};

const getSuggestedNextPaymentDate = (billingCycle: BillingCycle, baseDate = new Date()) => {
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  switch (billingCycle) {
    case 'weekly':
      return new Date(base.getFullYear(), base.getMonth(), base.getDate() + 7);
    case 'monthly':
      return addMonthsClamped(base, 1);
    case 'yearly':
      return addMonthsClamped(base, 12);
    case 'one_time':
    case 'custom':
    default:
      return base;
  }
};

const CATEGORY_LABELS_LOCAL: Record<SubscriptionCategory, string> = {
  entertainment: 'Rozrywka',
  utilities: 'Narzędzia',
  health: 'Zdrowie',
  education: 'Edukacja',
  productivity: 'Produktywność',
  shopping: 'Zakupy',
  finance: 'Finanse',
  transport: 'Transport',
  other: 'Inne',
};

const GENERATED_BRAND_PALETTES: Array<[string, string]> = [
  ['#20F6B5', '#22D3EE'],
  ['#A78BFA', '#F472B6'],
  ['#FBBF24', '#FB7185'],
  ['#60A5FA', '#34D399'],
  ['#F97316', '#F43F5E'],
  ['#E879F9', '#38BDF8'],
];

const CATEGORY_KEYWORDS: Array<{ category: SubscriptionCategory; terms: string[] }> = [
  { category: 'entertainment', terms: ['video', 'vod', 'film', 'serial', 'music', 'muzyka', 'stream', 'tidal', 'deezer', 'hbo', 'kino'] },
  { category: 'education', terms: ['duolingo', 'course', 'kurs', 'academy', 'learning', 'nauka', 'skillshare', 'masterclass'] },
  { category: 'productivity', terms: ['canva', 'figma', 'adobe', 'notion', 'office', 'workspace', 'chatgpt', 'ai', 'saas', 'pro'] },
  { category: 'health', terms: ['fitness', 'fit', 'calm', 'meditation', 'medytacja', 'diet', 'health', 'zdrowie'] },
  { category: 'shopping', terms: ['shop', 'smart', 'delivery', 'prime', 'market', 'allegro'] },
  { category: 'finance', terms: ['bank', 'budget', 'finanse', 'trading', 'broker'] },
  { category: 'transport', terms: ['uber', 'bolt', 'taxi', 'car', 'parking', 'transport'] },
  { category: 'utilities', terms: ['cloud', 'storage', 'vpn', 'hosting', 'domain', 'icloud', 'dropbox'] },
];

const normalizeServiceName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getServiceInitials = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const hashString = (value: string) =>
  normalizeServiceName(value).split('').reduce((hash, char) => hash + char.charCodeAt(0), 0);

const inferCategoryFromName = (value: string): SubscriptionCategory => {
  const normalized = normalizeServiceName(value);
  const match = CATEGORY_KEYWORDS.find((item) =>
    item.terms.some((term) => normalized.includes(normalizeServiceName(term)))
  );

  return match?.category ?? 'other';
};

const buildGeneratedIdentity = (value: string) => {
  const hash = hashString(value);
  const gradient = GENERATED_BRAND_PALETTES[hash % GENERATED_BRAND_PALETTES.length];
  const suggestedCategory = inferCategoryFromName(value);

  return {
    gradient,
    initials: getServiceInitials(value),
    suggestedCategory,
    categoryLabel: CATEGORY_LABELS_LOCAL[suggestedCategory],
  };
};

export const ManualAddScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'AddSubscription'>>();
  const route = useRoute<RouteProp<AppStackParamList, 'AddSubscription'>>();
  const { theme } = useTheme();
  const subscriptionId = route.params?.subscriptionId;

  const amountInputRef = useRef<TextInput>(null);
  const aiPulseAnim = useRef(new Animated.Value(0)).current;
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
  const [date, setDate] = useState(() => getSuggestedNextPaymentDate('monthly'));
  const [hasManualDate, setHasManualDate] = useState(false);
  const [hasManualCategory, setHasManualCategory] = useState(false);
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
  const [isAdditionalOptionsOpen, setIsAdditionalOptionsOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [aiPlans, setAiPlans] = useState<EstimatedCostPlan[]>([]);
  const [aiMessage, setAiMessage] = useState('');
  const [aiServiceName, setAiServiceName] = useState('');
  const [showSlowSaveHint, setShowSlowSaveHint] = useState(false);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const finalCalculatedCost = useMemo(() => {
    if (isNaN(parsedAmount)) return 0;
    if (isShared && peopleCount > 0) return parsedAmount / peopleCount;
    return parsedAmount;
  }, [parsedAmount, isShared, peopleCount]);

  const selectedPlanInsights = useMemo(() => {
    const plans = selectedService?.availablePlans || [];
    if (plans.length === 0) return [];

    const monthlyEquivalent = (price: number, billingCycle?: BillingCycle) =>
      billingCycle === 'yearly' ? price / 12 : price;
    const cheapestPlan = [...plans].sort(
      (a, b) => monthlyEquivalent(a.price, a.billingCycle) - monthlyEquivalent(b.price, b.billingCycle)
    )[0];
    const yearlyPlan = plans.find((plan) => plan.billingCycle === 'yearly');
    const selectedMonthly = parsedAmount > 0 ? monthlyEquivalent(parsedAmount, cycle) : null;
    const insights: Array<{ title: string; desc: string }> = [];

    if (cheapestPlan) {
      insights.push({
        title: 'Najtańszy wariant',
        desc: `${cheapestPlan.name}: ok. ${monthlyEquivalent(cheapestPlan.price, cheapestPlan.billingCycle).toFixed(2)} ${currency} / mc`,
      });
    }

    if (yearlyPlan && selectedMonthly) {
      const yearlyMonthly = monthlyEquivalent(yearlyPlan.price, 'yearly');
      const monthlySaving = selectedMonthly - yearlyMonthly;
      if (monthlySaving > 1) {
        insights.push({
          title: 'Warto sprawdzić roczny plan',
          desc: `Może obniżyć koszt o ok. ${monthlySaving.toFixed(2)} ${currency} / mc.`,
        });
      }
    }

    if (plans.some((plan) => plan.name.toLowerCase().includes('student'))) {
      insights.push({
        title: 'Możliwa zniżka studencka',
        desc: 'Jeśli masz status studenta, wybierz plan Student albo zapisz notatkę do sprawdzenia.',
      });
    }

    if (plans.some((plan) => /family|duo|rodzin/i.test(plan.name))) {
      insights.push({
        title: 'Plan współdzielony',
        desc: 'Duo/Family często daje niższy koszt na osobę przy legalnym współdzieleniu.',
      });
    }

    return insights.slice(0, 3);
  }, [cycle, currency, parsedAmount, selectedService]);

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

  const normalizedName = useMemo(() => normalizeServiceName(name), [name]);
  const hasExactPopularMatch = useMemo(
    () => subscriptionPlans.some((service) => normalizeServiceName(service.name) === normalizedName),
    [normalizedName, subscriptionPlans]
  );
  const isCustomServiceMode = normalizedName.length >= 3 && !selectedService && !hasExactPopularMatch;
  const generatedIdentity = useMemo(() => buildGeneratedIdentity(name), [name]);
  const aiButtonGlow = aiPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });
  const aiButtonScale = aiPulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.015, 1],
  });
  const shimmerTranslateX = aiPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 220],
  });

  useEffect(() => {
    if (!isCustomServiceMode && aiStatus !== 'loading') {
      aiPulseAnim.stopAnimation();
      aiPulseAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(aiPulseAnim, {
        toValue: 1,
        duration: aiStatus === 'loading' ? 950 : 1700,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [aiPulseAnim, aiStatus, isCustomServiceMode]);

  useEffect(() => {
    setAiPlans([]);
    setAiMessage('');
    setAiServiceName('');
    setAiStatus('idle');
  }, [normalizedName]);

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
      setHasManualCategory(false);
    } else {
      setSelectedService(service);
      setName(service.name);
      setAmount(service.defaultPrice);
      setCategory(service.category);
      setHasManualCategory(false);
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
        setHasManualDate(true);
      }
      if (existingSub.trialEndDate) {
        setTrialEndDate(parseAppDate(existingSub.trialEndDate) || new Date());
      }
    }
  }, [existingSub]);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setHasManualDate(true);
      setDate(selectedDate);
    }
  };

  const onTrialDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTrialPicker(false);
    if (selectedDate) setTrialEndDate(selectedDate);
  };

  const formatDate = (d: Date) => {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  const handleCycleChange = (nextCycle: BillingCycle) => {
    setCycle(nextCycle);

    if (!subscriptionId && !hasManualDate) {
      setDate(getSuggestedNextPaymentDate(nextCycle));
    }
  };

  const applyGeneratedCategory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCategory(generatedIdentity.suggestedCategory);
    setHasManualCategory(true);
  };

  const handleSelectAiPlan = (plan: EstimatedCostPlan) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAmount(plan.price.toString());
    setPlanName(plan.name);
    setCurrency('PLN');
    handleCycleChange(plan.billingCycle);

    if (!provider.trim()) {
      setProvider(aiServiceName || name.trim());
    }

    scrollToForm();
  };

  const handleFetchAiEstimate = async () => {
    const serviceName = name.trim();
    if (!serviceName || aiStatus === 'loading') return;

    Keyboard.dismiss();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAiStatus('loading');
    setAiMessage('');
    setAiPlans([]);
    setAiServiceName(serviceName);

    try {
      const result = await fetchEstimatedCost(serviceName);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAiMessage(result.message);
      setAiPlans(result.plans);
      setAiServiceName(result.serviceName || serviceName);

      if (result.suggestedCategory && !hasManualCategory) {
        setCategory(result.suggestedCategory);
      }

      setAiStatus(result.plans.length > 0 ? 'ready' : 'error');
    } catch {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAiStatus('error');
      setAiMessage('Nie udało się uruchomić predykcji AI. Wpisz koszt ręcznie albo spróbuj ponownie później.');
      setAiPlans([]);
    }
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
    if (__DEV__) {
      console.warn('[ManualAddScreen] Save warning:', error);
    }

    if (isTimeoutLikeError(error)) {
      Alert.alert(
        'Backend odpowiada wolno',
        'Nie mamy jeszcze potwierdzenia zapisu. Daliśmy backendowi więcej czasu, ale jeśli ten komunikat wróci, sprawdź listę subskrypcji przed kolejną próbą, żeby nie dodać duplikatu.'
      );
      return;
    }

    if (error instanceof ApiError) {
      if (error.status === 409) {
        Alert.alert('Duplikat', 'Subskrypcja o tej nazwie już istnieje. Otwórz ją z listy albo zmień nazwę planu.');
      } else if (error.status === 400 && error.body) {
        const body = error.body as any;
        const details = body.errors?.map((e: any) => `- ${e.message}`).join('\n') || error.message;
        Alert.alert('Sprawdź dane', details);
      } else {
        Alert.alert('Nie udało się zapisać', error.message || 'Spróbuj ponownie za chwilę.');
      }
    } else {
      Alert.alert('Brak połączenia', 'Nie udało się połączyć. Sprawdź sieć telefonu i spróbuj ponownie.');
    }
  };
  const isLoading = createMutation.isPending || updateMutation.isPending;

    useEffect(() => {
      if (!isLoading) {
        setShowSlowSaveHint(false);
        return;
      }

      const timeoutId = setTimeout(() => setShowSlowSaveHint(true), 8000);
      return () => clearTimeout(timeoutId);
    }, [isLoading]);

    const scrollViewRef = useRef<ScrollView>(null);
  
    const scrollToForm = () => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 150, animated: true });
      }
    };
  
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
        <View style={[styles.appGlowTop, { backgroundColor: `${theme.colors.primary}29` }]} />
        <View style={[styles.appGlowBottom, { backgroundColor: `${theme.colors.cyan}24` }]} />
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
              <View style={styles.header}>
                <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.goBack()}>
                  <X size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                  <Text style={styles.headerEyebrow}>{subscriptionId ? 'Edycja subskrypcji' : 'Nowa subskrypcja'}</Text>
                  <Text style={styles.headerTitle}>Skonfiguruj plan</Text>
                </View>
                <View style={[styles.headerStepBadge, { backgroundColor: `${theme.colors.primary}24`, borderColor: `${theme.colors.primary}44` }]}>
                  <Text style={[styles.headerStepText, { color: theme.colors.primary }]}>{isValid ? 'Gotowe' : 'Setup'}</Text>
                </View>
              </View>
  
              <ScrollView 
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                nestedScrollEnabled
                scrollEventThrottle={16}
                decelerationRate="fast"
              >
              <LinearGradient colors={theme.gradients.hero} style={[styles.amountHeader, { shadowColor: theme.colors.primary }]}>
                <Text style={styles.amountLabel}>Kwota subskrypcji</Text>
                
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
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.plansScrollContent}
                    >
                      {selectedService.availablePlans.map((plan) => {
                        const isActivePlan = planName === plan.name && parsedAmount === plan.price;
                        return (
                        <TouchableOpacity
                          key={`${plan.name}-${plan.price}`}
                          style={[
                            styles.planCard,
                            isActivePlan && [styles.planCardActive, { borderColor: theme.colors.primary }]
                          ]}
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setAmount(plan.price.toString());
                            setPlanName(plan.name);
                            if (plan.billingCycle) handleCycleChange(plan.billingCycle);
                            scrollToForm();
                          }}
                        >
                          <Text style={[styles.planCardName, isActivePlan && { color: theme.colors.primary }]} numberOfLines={1}>
                            {plan.name}
                          </Text>
                          <View style={styles.planCardPriceRow}>
                            <Text style={[styles.planCardPrice, isActivePlan && { color: theme.colors.primary }]}>
                              {plan.price.toFixed(2)}
                            </Text>
                            <Text style={[styles.planCardCurrency, isActivePlan && { color: theme.colors.primary }]}>
                              {currency}
                            </Text>
                          </View>
                          <Text style={[styles.planCardCycle, isActivePlan && { color: theme.colors.primary }]}>
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
                        <ArrowRight size={16} color={theme.colors.darkText} />
                      </TouchableOpacity>
                    )}

                    {selectedPlanInsights.length > 0 && (
                      <View style={styles.planInsights}>
                        {selectedPlanInsights.map((insight) => (
                          <View key={insight.title} style={styles.planInsightRow}>
                            <View style={styles.planInsightDot} />
                            <View style={styles.planInsightCopy}>
                              <Text style={styles.planInsightTitle}>{insight.title}</Text>
                              <Text style={styles.planInsightDesc}>{insight.desc}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.amountRow}>
                    <TextInput
                      style={[styles.amountInput, isSubmitted && parsedAmount <= 0 && { color: theme.colors.danger }]}
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
                        style={[styles.currencyPill, currency === c && { backgroundColor: `${theme.colors.primary}24`, borderColor: theme.colors.primary }]}
                        onPress={() => setCurrency(c)}
                      >
                        <Text style={[styles.currencyPillText, currency === c && { color: theme.colors.primary }]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={styles.costPreviewRow}>
                  <View style={styles.costPreviewPill}>
                    <Text style={styles.costPreviewLabel}>Twój koszt</Text>
                    <Text style={styles.costPreviewValue}>{finalCalculatedCost.toFixed(2)} {currency}</Text>
                  </View>
                  <View style={styles.costPreviewPill}>
                    <Text style={styles.costPreviewLabel}>Tryb</Text>
                    <Text style={styles.costPreviewValue}>{isShared ? `${peopleCount} osoby` : 'Solo'}</Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.formSection}>
                <View style={[styles.infoBox, { marginBottom: 20, backgroundColor: `${theme.colors.primary}18`, borderColor: `${theme.colors.primary}33` }]}>
                  <AlertCircle size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.infoBoxText, { color: theme.colors.textMuted }]}>
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
                      <Text style={[styles.label, { color: theme.colors.primary }]}>Sugestie</Text>
                    )}
                  </View>
                  
                  {filteredSuggestions.length > 0 && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
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
                    style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }, isSubmitted && name.trim().length === 0 && { borderWidth: 1, borderColor: theme.colors.danger }]}
                    value={name} 
                    onChangeText={(value) => {
                      setName(value);
                      if (selectedService && value !== selectedService.name) {
                        setSelectedService(null);
                      }
                    }}
                    placeholder="np. Netflix" 
                    placeholderTextColor={theme.colors.textSubtle}
                  />

                  {isCustomServiceMode && (
                    <View style={[styles.customIdentityCard, { borderColor: `${theme.colors.primary}33` }]}>
                      <LinearGradient colors={generatedIdentity.gradient} style={styles.generatedBrandMark}>
                        <Text style={styles.generatedBrandInitials}>{generatedIdentity.initials}</Text>
                      </LinearGradient>
                      <View style={styles.customIdentityCopy}>
                        <Text style={[styles.customIdentityTitle, { color: theme.colors.text }]}>Własna usługa wykryta</Text>
                        <Text style={[styles.customIdentityText, { color: theme.colors.textMuted }]}>
                          Wygenerowaliśmy styl i kategorię: {generatedIdentity.categoryLabel}.
                        </Text>
                      </View>
                      {category !== generatedIdentity.suggestedCategory && (
                        <TouchableOpacity
                          style={[styles.useCategoryButton, { backgroundColor: `${theme.colors.primary}18`, borderColor: `${theme.colors.primary}33` }]}
                          onPress={applyGeneratedCategory}
                        >
                          <Wand2 size={14} color={theme.colors.primary} />
                          <Text style={[styles.useCategoryText, { color: theme.colors.primary }]}>Użyj</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {isCustomServiceMode && (
                    <View style={styles.aiPredictorBlock}>
                      <Animated.View style={[styles.aiGlowLayer, { opacity: aiButtonGlow, transform: [{ scale: aiButtonScale }], backgroundColor: `${theme.colors.primary}26` }]} />
                      <TouchableOpacity
                        activeOpacity={0.86}
                        style={[styles.aiPredictButton, { borderColor: `${theme.colors.primary}55`, shadowColor: theme.colors.primary }]}
                        onPress={handleFetchAiEstimate}
                        disabled={aiStatus === 'loading'}
                      >
                        <Sparkles size={18} color={theme.colors.darkText} />
                        <Text style={[styles.aiPredictButtonText, { color: theme.colors.darkText }]}>
                          {aiStatus === 'loading' ? 'Szukam orientacyjnych cen...' : '✨ Poszukaj cen w sieci / Zapytaj AI'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {aiStatus === 'loading' && (
                    <View style={[styles.aiLoadingCard, { borderColor: theme.colors.border }]}>
                      <Animated.View style={[styles.aiShimmer, { transform: [{ translateX: shimmerTranslateX }, { rotate: '12deg' }] }]} />
                      <View style={styles.aiSkeletonLineWide} />
                      <View style={styles.aiSkeletonLine} />
                      <View style={styles.aiSkeletonPlans}>
                        <View style={styles.aiSkeletonPlan} />
                        <View style={styles.aiSkeletonPlan} />
                      </View>
                    </View>
                  )}

                  {aiStatus !== 'loading' && aiMessage ? (
                    <View style={[styles.aiMessageCard, { borderColor: aiStatus === 'ready' ? `${theme.colors.primary}33` : `${theme.colors.warning}44` }]}>
                      <Sparkles size={16} color={aiStatus === 'ready' ? theme.colors.primary : theme.colors.warning} />
                      <Text style={[styles.aiMessageText, { color: theme.colors.textMuted }]}>{aiMessage}</Text>
                    </View>
                  ) : null}

                  {aiPlans.length > 0 && (
                    <View style={styles.aiPlansSection}>
                      <Text style={[styles.aiPlansTitle, { color: theme.colors.text }]}>Orientacyjne plany</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.aiPlansContent}
                      >
                        {aiPlans.map((plan) => {
                          const isActivePlan = planName === plan.name && parsedAmount === plan.price;
                          return (
                            <TouchableOpacity
                              key={`${plan.name}-${plan.price}-${plan.billingCycle}`}
                              style={[
                                styles.aiPlanCard,
                                isActivePlan && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}20` },
                              ]}
                              onPress={() => handleSelectAiPlan(plan)}
                            >
                              <Text style={[styles.aiPlanName, isActivePlan && { color: theme.colors.primary }]} numberOfLines={1}>
                                {plan.name}
                              </Text>
                              <View style={styles.planCardPriceRow}>
                                <Text style={[styles.aiPlanPrice, isActivePlan && { color: theme.colors.primary }]}>
                                  {plan.price.toFixed(2)}
                                </Text>
                                <Text style={[styles.aiPlanCurrency, isActivePlan && { color: theme.colors.primary }]}>PLN</Text>
                              </View>
                              <Text style={[styles.aiPlanCycle, isActivePlan && { color: theme.colors.primary }]}>
                                {CYCLES.find((item) => item.id === plan.billingCycle)?.label || plan.billingCycle}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.labelOptional}>Dostawca</Text>
                  <TextInput 
                    style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={provider} 
                    onChangeText={setProvider} 
                    placeholder="np. Google, Apple" 
                    placeholderTextColor={theme.colors.textSubtle}
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {CYCLES.map(c => (
                      <TouchableOpacity 
                        key={c.id} 
                        style={[styles.pill, cycle === c.id && { backgroundColor: `${theme.colors.primary}24`, borderColor: theme.colors.primary }]}
                        onPress={() => handleCycleChange(c.id)}
                      >
                        <Text style={[styles.pillText, cycle === c.id && { color: theme.colors.primary }]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Następna płatność</Text>
                  <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                    <Calendar size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.dateText}>{formatDate(date)}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.dateHint, { color: theme.colors.textMuted }]}>
                    {hasManualDate
                      ? 'Data ustawiona ręcznie.'
                      : 'Podpowiadamy ją automatycznie na podstawie cyklu.'}
                  </Text>
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity 
                        key={cat.id} 
                        style={[styles.catPill, category === cat.id && { borderColor: cat.textColor, borderWidth: 2 }]}
                        onPress={() => {
                          setCategory(cat.id);
                          setHasManualCategory(true);
                        }}
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
                      style={[styles.toggle, isTrial && { backgroundColor: theme.colors.primary }]}
                    >
                      <View style={[styles.toggleDot, isTrial && styles.toggleDotActive]} />
                    </TouchableOpacity>
                  </View>
                </View>

                {isTrial && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Koniec triala</Text>
                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowTrialPicker(true)}>
                      <Calendar size={20} color={theme.colors.warning} style={{ marginRight: 8 }} />
                      <Text style={[styles.dateText, { color: theme.colors.warning }]}>{formatDate(trialEndDate)}</Text>
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
                      style={[styles.toggle, isShared && { backgroundColor: theme.colors.primary }]}
                    >
                      <View style={[styles.toggleDot, isShared && styles.toggleDotActive]} />
                    </TouchableOpacity>
                  </View>
                  
                  {isShared && (
                    <View style={{ marginTop: 16, backgroundColor: 'rgba(255,255,255,0.07)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border }}>
                      <Text style={[styles.labelOptional, { marginBottom: 12 }]}>Liczba osób</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                        <TouchableOpacity 
                          style={styles.stepperBtn}
                          onPress={() => setPeopleCount(Math.max(2, peopleCount - 1))}
                        >
                          <Text style={styles.stepperBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: theme.colors.text, minWidth: 40, textAlign: 'center' }}>{peopleCount}</Text>
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
                      <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.primary }}>
                        Twój koszt: {finalCalculatedCost.toFixed(2)} {currency}
                      </Text>
                    </View>
                  )}
                </View>

                </View>

                <View style={styles.formCard}>
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    activeOpacity={0.86}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setIsAdditionalOptionsOpen((current) => !current);
                    }}
                  >
                    <View style={styles.sectionHeaderBlockCompact}>
                      <Text style={styles.sectionHeaderTitle}>Opcje dodatkowe</Text>
                      <Text style={styles.sectionHeaderHint}>Notatki, statystyki i późniejsza optymalizacja</Text>
                    </View>
                    <View style={[styles.accordionIcon, { backgroundColor: `${theme.colors.primary}18`, borderColor: `${theme.colors.primary}33` }]}>
                      <ChevronDown
                        size={18}
                        color={theme.colors.primary}
                        style={{ transform: [{ rotate: isAdditionalOptionsOpen ? '180deg' : '0deg' }] }}
                      />
                    </View>
                  </TouchableOpacity>

                  {isAdditionalOptionsOpen && (
                    <>
                      <View style={styles.optionalGroup}>
                        <View style={[styles.cancelAssistantHint, { backgroundColor: `${theme.colors.primary}16`, borderColor: `${theme.colors.primary}33` }]}>
                          <ShieldCheck size={18} color={theme.colors.primary} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cancelAssistantHintTitle}>Anulowanie obsłuży Cancel Assistant</Text>
                            <Text style={styles.cancelAssistantHintText}>
                              Nie musisz wklejać linku ręcznie. Instrukcje i linki anulowania pokażemy w szczegółach subskrypcji.
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.optionalGroup}>
                        <Text style={styles.labelOptional}>Notatki</Text>
                        <TextInput
                          style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
                          value={notes}
                          onChangeText={setNotes}
                          placeholder="Wpisz dodatkowe informacje..."
                          placeholderTextColor={theme.colors.textSubtle}
                          multiline
                        />
                      </View>

                      <View style={styles.optionalGroup}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.labelOptional}>Uwzględnij w statystykach</Text>
                          <TouchableOpacity
                            onPress={() => setIncludeInStats(!includeInStats)}
                            style={[styles.toggle, includeInStats && { backgroundColor: theme.colors.primary }]}
                          >
                            <View style={[styles.toggleDot, includeInStats && styles.toggleDotActive]} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.infoBoxText, { marginTop: 8, color: theme.colors.textMuted }]}>
                          Po wyłączeniu koszt tej usługi nie będzie doliczany do podsumowań i trendów subskrypcji.
                        </Text>
                      </View>
                    </>
                  )}
                </View>
                <View style={styles.saveSummaryCard}>
                  <View>
                    <Text style={styles.saveSummaryLabel}>Podsumowanie</Text>
                    <Text style={styles.saveSummaryTitle} numberOfLines={1}>
                      {name.trim() || 'Nowa subskrypcja'}
                    </Text>
                    <Text style={styles.saveSummaryMeta} numberOfLines={1}>
                      {planName ? `${planName} · ` : ''}{formatDate(date)}
                    </Text>
                  </View>
                  <View style={styles.saveSummaryAmountBlock}>
                    <Text style={[styles.saveSummaryAmount, { color: theme.colors.primary }]}>{finalCalculatedCost.toFixed(2)}</Text>
                    <Text style={[styles.saveSummaryCurrency, { color: theme.colors.textMuted }]}>
                      {currency} · {CYCLES.find((item) => item.id === cycle)?.label || cycle}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }, isLoading && styles.saveButtonLoading]}
                  onPress={handleSave}
                  disabled={isLoading || !isValid}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator color={theme.colors.darkText} />
                      <Text style={styles.saveButtonText}>
                        {showSlowSaveHint ? 'Nadal zapisuję...' : 'Zapisuję...'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.saveButtonText}>Zapisz subskrypcję</Text>
                      <ArrowRight size={20} color={theme.colors.darkText} />
                    </>
                  )}
                </TouchableOpacity>

                {showSlowSaveHint && (
                  <View style={[styles.slowSaveHint, { borderColor: `${theme.colors.warning}44`, backgroundColor: `${theme.colors.warning}14` }]}>
                    <AlertCircle size={16} color={theme.colors.warning} />
                    <Text style={[styles.slowSaveHintText, { color: theme.colors.textMuted }]}>
                      Backend odpowiada wolniej niż zwykle. Czekamy na potwierdzenie, żeby nie wysłać zapisu drugi raz.
                    </Text>
                  </View>
                )}
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
  appGlowTop: {
    position: 'absolute',
    top: -130,
    right: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  appGlowBottom: {
    position: 'absolute',
    bottom: 120,
    left: -160,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(139,92,246,0.14)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, alignItems: 'center', gap: 12 },
  headerIconButton: { width: 46, height: 46, borderRadius: 18, backgroundColor: vibrantTheme.colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  headerCenter: { flex: 1 },
  headerEyebrow: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  headerTitle: { fontSize: 23, fontWeight: '900', color: vibrantTheme.colors.text, marginTop: 2 },
  headerStepBadge: { minWidth: 66, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  headerStepText: { color: vibrantTheme.colors.primary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  scrollContent: { paddingBottom: 44, flexGrow: 1, paddingHorizontal: 16 },
  amountHeader: {
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
    overflow: 'hidden',
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
  costPreviewRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  costPreviewPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  costPreviewLabel: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  costPreviewValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  formSection: { margin: 0 },
  formCard: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
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
  sectionHeaderBlockCompact: {
    flex: 1,
    paddingHorizontal: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accordionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
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
  textInput: { fontSize: 16, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 18, paddingHorizontal: 15, paddingVertical: 14, color: vibrantTheme.colors.text, fontWeight: '700', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', marginRight: 8, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  pillActive: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: vibrantTheme.colors.primary },
  pillText: { color: vibrantTheme.colors.textMuted, fontWeight: '700' },
  pillTextActive: { color: vibrantTheme.colors.primary },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.09)', padding: 15, borderRadius: 18, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  dateText: { fontSize: 16, fontWeight: '700', color: vibrantTheme.colors.primary },
  dateHint: { marginTop: 8, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  catText: { marginLeft: 6, fontWeight: '700', fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { width: 52, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', padding: 3 },
  toggleActive: { backgroundColor: vibrantTheme.colors.primary },
  toggleDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  toggleDotActive: { transform: [{ translateX: 22 }] },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.13)',
    padding: 12,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
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
    borderRadius: 22,
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
  saveSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    marginTop: 4,
  },
  saveSummaryLabel: {
    color: vibrantTheme.colors.textSubtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  saveSummaryTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
    maxWidth: 190,
  },
  saveSummaryMeta: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
    maxWidth: 190,
  },
  saveSummaryAmountBlock: {
    alignItems: 'flex-end',
  },
  saveSummaryAmount: {
    color: vibrantTheme.colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  saveSummaryCurrency: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  saveButtonLoading: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: vibrantTheme.colors.darkText,
    fontSize: 17,
    fontWeight: '800',
  },
  slowSaveHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  slowSaveHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
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
    backgroundColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  suggestionIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
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
    fontWeight: '800',
    color: vibrantTheme.colors.text,
  },
  customIdentityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
  },
  generatedBrandMark: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  generatedBrandInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  customIdentityCopy: {
    flex: 1,
  },
  customIdentityTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  customIdentityText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  useCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  useCategoryText: {
    fontSize: 11,
    fontWeight: '900',
  },
  aiPredictorBlock: {
    marginTop: 12,
  },
  aiGlowLayer: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 22,
  },
  aiPredictButton: {
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: vibrantTheme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
  },
  aiPredictButtonText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  aiLoadingCard: {
    marginTop: 12,
    minHeight: 112,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
  },
  aiShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ rotate: '12deg' }],
  },
  aiSkeletonLineWide: {
    width: '78%',
    height: 13,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  aiSkeletonLine: {
    width: '52%',
    height: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  aiSkeletonPlans: {
    flexDirection: 'row',
    gap: 10,
  },
  aiSkeletonPlan: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  aiMessageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
  },
  aiMessageText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  aiPlansSection: {
    marginTop: 14,
  },
  aiPlansTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  aiPlansContent: {
    gap: 10,
    paddingRight: 16,
  },
  aiPlanCard: {
    minWidth: 128,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    alignItems: 'center',
  },
  aiPlanName: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    maxWidth: 104,
    marginBottom: 8,
  },
  aiPlanPrice: {
    color: vibrantTheme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  aiPlanCurrency: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 3,
  },
  aiPlanCycle: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
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
    backgroundColor: 'rgba(255,255,255,0.14)',
    padding: 16,
    borderRadius: 22,
    minWidth: 122,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  planCardActive: {
    backgroundColor: 'rgba(255,255,255,0.94)',
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
    color: '#334155',
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
    color: '#334155',
  },
  planCardCurrency: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  planCardCurrencyActive: {
    color: '#334155',
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
    backgroundColor: 'rgba(255,255,255,0.94)',
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
    color: vibrantTheme.colors.darkText,
    fontSize: 14,
    fontWeight: '900',
  },
  planInsights: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 12,
    gap: 10,
  },
  planInsightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  planInsightDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginTop: 6,
  },
  planInsightCopy: { flex: 1 },
  planInsightTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  planInsightDesc: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
    fontWeight: '600',
  },
  cancelAssistantHint: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  cancelAssistantHintTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  cancelAssistantHintText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 24,
    fontWeight: '600',
    color: vibrantTheme.colors.text,
    lineHeight: 28,
  },
});

export default ManualAddScreen;
