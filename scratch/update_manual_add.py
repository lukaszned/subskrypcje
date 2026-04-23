import re

with open('src/screens/ManualAddScreen.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("import { useNavigation } from '@react-navigation/native';", "import { useNavigation } from '@react-navigation/native';\nimport { useSubscriptionStore } from '../store/useSubscriptionStore';\nimport { Users } from 'lucide-react-native';")

state_code = """
  const [category, setCategory] = useState('rozrywka');
  const [customCategory, setCustomCategory] = useState('');
  const [splitWith, setSplitWith] = useState(1);
  const addSubscription = useSubscriptionStore(state => state.addSubscription);
"""
code = code.replace("""  const [category, setCategory] = useState('rozrywka');
  const [customCategory, setCustomCategory] = useState('');""", state_code)

save_code = """
  const handleSave = () => {
    if (!isValid) return;
    
    const finalCategory = category === 'wlasna' ? customCategory || 'Własna' : CATEGORIES.find(c => c.id === category)?.label || category;

    // Dodanie do store
    addSubscription({
      name,
      category: finalCategory,
      amount: parsedAmount,
      currency: 'PLN',
      nextPaymentDate: formattedDate,
      cycle,
      status: 'active',
      splitWith
    });

    Alert.alert(
      "Sukces", 
      `Subskrypcja została dodana pomyślnie.`,
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
  };
"""

code = re.sub(r"  const handleSave = \(\) => \{.*?^\s*};\n", save_code, code, flags=re.MULTILINE|re.DOTALL)

split_ui = """
                {/* WSPÓŁDZIELENIE */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Users size={16} color="#64748B" />
                    <Text style={[styles.label, { marginBottom: 0, marginLeft: 6 }]}>Dzielę koszty z...</Text>
                  </View>
                  <View style={styles.pillsContainer}>
                    {[1, 2, 3, 4, 5, 6].map(num => {
                      const isActive = splitWith === num;
                      return (
                        <TouchableOpacity
                          key={num}
                          activeOpacity={0.8}
                          onPress={() => setSplitWith(num)}
                          style={[styles.pill, isActive && styles.pillActive, { paddingHorizontal: 12 }]}
                        >
                          <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                            {num === 1 ? 'Tylko ja' : `${num} osoby`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {splitWith > 1 && parsedAmount > 0 && (
                    <Text style={{ marginTop: 8, fontSize: 13, color: '#6366F1', fontWeight: '500' }}>
                      Twój koszt wyniesie {(parsedAmount / splitWith).toFixed(2)} PLN
                    </Text>
                  )}
                </View>

                {/* KATEGORIA */}
"""

code = code.replace("                {/* KATEGORIA */}", split_ui)

with open('src/screens/ManualAddScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated ManualAddScreen')
