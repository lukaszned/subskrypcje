import re

with open('src/screens/DashboardScreen.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add Sun/Moon imports
code = code.replace("from 'lucide-react-native';", "from 'lucide-react-native';\nimport { Sun, Moon } from 'lucide-react-native';")

# Change component signature to include state
state_code = """
export const DashboardScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  const theme = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textDim: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    iconBg: isDark ? '#334155' : '#EEF2FF',
    iconWarningBg: isDark ? '#78350F' : '#FEF3C7',
    iconWarningText: isDark ? '#FBBF24' : '#D97706',
    cardWarningBg: isDark ? '#451A03' : '#FFFBEB',
    cardWarningBorder: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.4)',
    redBg: isDark ? '#450A0A' : '#FEF2F2',
    redText: isDark ? '#FCA5A5' : '#EF4444',
  };

  const dynamicStyles = getStyles(theme);
"""

code = code.replace("""export const DashboardScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(true);""", state_code)

# Replace styles. with dynamicStyles.
code = code.replace('styles.', 'dynamicStyles.')
code = code.replace('dynamicStyles.create', 'StyleSheet.create')

# Add toggle button to header
header_code = """  const renderHeader = () => (
    <View style={[dynamicStyles.headerCard, dynamicStyles.shadow]}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={dynamicStyles.headerSubtitle}>Całkowity koszt miesięczny</Text>
        <TouchableOpacity onPress={() => setIsDark(!isDark)}>
          {isDark ? <Sun size={20} color={theme.textDim} /> : <Moon size={20} color={theme.textDim} />}
        </TouchableOpacity>
      </View>"""
code = code.replace("""  const renderHeader = () => (
    <View style={[dynamicStyles.headerCard, dynamicStyles.shadow]}>
      <Text style={dynamicStyles.headerSubtitle}>Całkowity koszt miesięczny</Text>""", header_code)

# Replace the styles object with a function
code = code.replace('const styles = StyleSheet.create({', 'const getStyles = (theme: any) => StyleSheet.create({')

# Now apply theme colors to styles
code = re.sub(r"backgroundColor:\s*'#F8FAFC'", "backgroundColor: theme.bg", code)
code = re.sub(r"backgroundColor:\s*'#FFFFFF'", "backgroundColor: theme.card", code)
code = re.sub(r"color:\s*'#0F172A'", "color: theme.text", code)
code = re.sub(r"color:\s*'#64748B'", "color: theme.textDim", code)
code = re.sub(r"borderColor:\s*'#E2E8F0'", "borderColor: theme.border", code)

code = re.sub(r"backgroundColor:\s*'#EEF2FF'", "backgroundColor: theme.iconBg", code)
code = re.sub(r"backgroundColor:\s*'#FEF3C7'", "backgroundColor: theme.iconWarningBg", code)
code = re.sub(r"color:\s*'#D97706'", "color: theme.iconWarningText", code)
code = re.sub(r"backgroundColor:\s*'#FFFBEB'", "backgroundColor: theme.cardWarningBg", code)
code = re.sub(r"borderColor:\s*'rgba\(245,\s*158,\s*11,\s*0\.4\)'", "borderColor: theme.cardWarningBorder", code)

code = re.sub(r"backgroundColor:\s*'#FEF2F2'", "backgroundColor: theme.redBg", code)
code = re.sub(r"color:\s*'#EF4444'", "color: theme.redText", code)
code = re.sub(r"backgroundColor:\s*'#F1F5F9'", "backgroundColor: theme.border", code) # use border for light grey elements

with open('src/screens/DashboardScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Done!')
