import re

with open('src/screens/DashboardScreen.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add imports
code = code.replace("import { RootStackParamList } from '../../App';", "import { RootStackParamList } from '../../App';\nimport { useSubscriptionStore } from '../store/useSubscriptionStore';\nimport { DonutChart } from '../components/DonutChart';")

# Remove old Subscription interface and MOCK_SUBSCRIPTIONS
# We will just replace INITIAL_DATA block or just MOCK_SUBSCRIPTIONS
code = re.sub(r"const MOCK_SUBSCRIPTIONS: Subscription\[\] = \[.*?\];\n", "", code, flags=re.MULTILINE|re.DOTALL)

state_code = """
  const { subscriptions } = useSubscriptionStore();

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalCost = activeSubscriptions.reduce((acc, curr) => acc + (curr.amount / (curr.splitWith || 1)), 0);

  // Generowanie danych do wykresu
  const categoryColors: Record<string, string> = {
    'Rozrywka': '#6366F1', // indigo
    'Muzyka': '#EAB308',   // yellow
    'Zdrowie': '#22C55E',  // green
    'Narzędzia': '#3B82F6',// blue
    'Auto / OC': '#BE185D',// pink
    'Inne': '#64748B',     // slate
  };

  const chartData = activeSubscriptions.reduce((acc: any[], curr) => {
    const cost = curr.amount / (curr.splitWith || 1);
    const existing = acc.find(c => c.category === curr.category);
    if (existing) {
      existing.value += cost;
    } else {
      acc.push({
        category: curr.category,
        value: cost,
        color: categoryColors[curr.category] || categoryColors['Inne']
      });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value); // od największego

  const renderAnalyticsPlaceholder = () => (
    <View style={[dynamicStyles.analyticsCard, dynamicStyles.shadowSm]}>
      <View style={dynamicStyles.analyticsHeader}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={dynamicStyles.sectionTitle}>Wydatki wg Kategorii</Text>
          <TouchableOpacity onPress={() => navigation.navigate('NotificationsTest')} style={{ marginLeft: 8 }}>
            <Activity size={20} color={theme.textDim} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
        <DonutChart data={chartData} radius={50} strokeWidth={16} />
        
        <View style={{ flex: 1, marginLeft: 24, gap: 8 }}>
          {chartData.length === 0 ? (
            <Text style={{ color: theme.textDim, fontSize: 13 }}>Brak aktywnych wydatków</Text>
          ) : (
            chartData.slice(0, 4).map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: theme.text, fontWeight: '500' }} numberOfLines={1}>{item.category}</Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.text, fontWeight: '700' }}>{Math.round((item.value / totalCost) * 100)}%</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
"""

# Replace state and analitycs
# First, remove old renderAnalyticsPlaceholder
code = re.sub(r"  const renderAnalyticsPlaceholder = \(\) => \(.*?  \);\n", "", code, flags=re.MULTILINE|re.DOTALL)

# Insert the new code inside DashboardScreen, right after useNavigation
injection = """  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);"""

code = code.replace(injection, injection + state_code)

# Replace 458.50 with totalCost
code = code.replace("<Text style={dynamicStyles.headerAmount}>458.50</Text>", "<Text style={dynamicStyles.headerAmount}>{totalCost.toFixed(2)}</Text>")

# Replace MOCK_SUBSCRIPTIONS.map with subscriptions.map in the list
code = code.replace("{MOCK_SUBSCRIPTIONS.map((item) => (", "{activeSubscriptions.slice(0, 4).map((item: any) => (")

with open('src/screens/DashboardScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated Dashboard')
