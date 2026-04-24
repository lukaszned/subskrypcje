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
  Alert
} from 'react-native';
import { X, Edit2, Calendar, LayoutGrid, RotateCw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const CATEGORIES = [
  { id: 'rozrywka', label: 'Rozrywka', color: '#E0E7FF', textColor: '#4F46E5' },
  { id: 'muzyka', label: 'Muzyka', color: '#FEF08A', textColor: '#CA8A04' },
  { id: 'zdrowie', label: 'Zdrowie', color: '#DCFCE7', textColor: '#16A34A' },
  { id: 'narzedzia', label: 'Narzędzia', color: '#DBEAFE', textColor: '#2563EB' },
  { id: 'auto', label: 'Auto / OC', color: '#FCE7F3', textColor: '#BE185D' },
  { id: 'wlasna', label: 'Własna', color: '#F1F5F9', textColor: '#475569' },
  { id: 'inne', label: 'Inne', color: '#F1F5F9', textColor: '#64748B' },
];

const CYCLES = ['Co miesiąc', 'Co rok', 'Niestandardowy'];

export const ManualAddScreen = () => {
  const navigation = useNavigation();
  const amountInputRef = useRef<TextInput>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [cycle, setCycle] = useState('Co miesiąc');
  const [category, setCategory] = useState('rozrywka');
  const [customCategory, setCustomCategory] = useState('');

  // Walidacja: nazwa niepusta, kwota > 0
  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const isValid = name.trim().length > 0 && !isNaN(parsedAmount) && parsedAmount > 0;

  // Formatowanie dzisiejszej daty do mocka
  const today = new Date();
  const formattedDate = today.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  useEffect(() => {
    // Automatyczny focus na pole kwoty po małym opóźnieniu dla płynności animacji modala
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    if (!isValid) return;
    
    const finalCategory = category === 'wlasna' ? customCategory || 'Własna' : CATEGORIES.find(c => c.id === category)?.label || category;

    Alert.alert(
      "Sukces", 
      `Zapisano subskrypcję ${name} na kwotę ${parsedAmount.toFixed(2)} PLN.\nKategoria: ${finalCategory}\n(Mock)`,
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
  };

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
                disabled={!isValid}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.saveButtonText, !isValid && styles.saveButtonDisabled]}>
                  Zapisz
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* HERO INPUT (Kwota) */}
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
                      // Pozwalamy tylko na cyfry i kropkę/przecinek
                      const formatted = text.replace(/[^0-9.,]/g, '');
                      setAmount(formatted);
                    }}
                    maxLength={8}
                  />
                  <Text style={styles.currencyText}>PLN</Text>
                </View>
              </View>

              {/* FORM FIELDS */}
              <View style={styles.formSection}>
                
                {/* NAZWA */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nazwa usługi</Text>
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

                {/* CYKL ROZLICZENIOWY */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <RotateCw size={16} color="#64748B" />
                    <Text style={[styles.label, { marginBottom: 0, marginLeft: 6 }]}>Cykl rozliczeniowy</Text>
                  </View>
                  <View style={styles.pillsContainer}>
                    {CYCLES.map(c => {
                      const isActive = cycle === c;
                      return (
                        <TouchableOpacity
                          key={c}
                          activeOpacity={0.8}
                          onPress={() => setCycle(c)}
                          style={[styles.pill, isActive && styles.pillActive]}
                        >
                          <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                            {c}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* DATA PŁATNOŚCI (MOCK) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pierwsza płatność</Text>
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
                            isActive && { borderWidth: 2, borderColor: cat.textColor }
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

                {category === 'wlasna' && (
                  <View style={[styles.inputGroup, { marginTop: -10, borderBottomWidth: 0 }]}>
                    <TextInput
                      style={[styles.input, { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 44 }]}
                      placeholder="Wpisz własną kategorię..."
                      placeholderTextColor="#94A3B8"
                      value={customCategory}
                      onChangeText={setCustomCategory}
                      autoFocus={true}
                    />
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
  },
  headerButton: {
    minWidth: 60,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  saveButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  saveButtonDisabled: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // HERO INPUT
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: 56,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    minWidth: 120, // Zapewnia miejsce nawet gdy puste
  },
  currencyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
    marginTop: 16, // Lekko obniżone, by zrównać z bazową linią dużej czcionki
  },
  // FORM
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  inputGroup: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  // PILLS
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // DATE MOCK
  dateMockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF', // indygo-50
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E7FF', // indygo-100
  },
  dateMockText: {
    fontSize: 16,
    color: '#4F46E5', // indygo-600
    fontWeight: '600',
  },
  // CATEGORY SCROLL
  categoryScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ManualAddScreen;
