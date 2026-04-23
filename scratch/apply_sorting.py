import re

with open('src/screens/SubscriptionListScreen.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add sort state
state_code = """
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'cancelled'>('active');
  const [sortBy, setSortBy] = useState<'none' | 'priceAsc' | 'priceDesc' | 'dateAsc'>('none');

  const toggleSort = () => {
    if (sortBy === 'none') setSortBy('priceDesc');
    else if (sortBy === 'priceDesc') setSortBy('priceAsc');
    else if (sortBy === 'priceAsc') setSortBy('dateAsc');
    else setSortBy('none');
  };
"""
code = code.replace("""  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'cancelled'>('active');""", state_code)

# Update useMemo logic
memo_code = """
  const filteredData = useMemo(() => {
    let result = data.filter(item => {
      const matchesTab = item.status === activeTab;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });

    if (sortBy === 'priceAsc') {
      result.sort((a, b) => a.amount - b.amount);
    } else if (sortBy === 'priceDesc') {
      result.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'dateAsc') {
      // Proste sortowanie daty - mock.
      result.sort((a, b) => {
        if (a.nextPaymentDate === '-') return 1;
        if (b.nextPaymentDate === '-') return -1;
        return a.nextPaymentDate.localeCompare(b.nextPaymentDate);
      });
    }

    return result;
  }, [data, activeTab, searchQuery, sortBy]);
"""
code = code.replace("""  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesTab = item.status === activeTab;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [data, activeTab, searchQuery]);""", memo_code)

# Update sort button UI
sort_btn_old = """          <TouchableOpacity style={styles.sortButton} activeOpacity={0.7}>
            <ArrowUpDown size={20} color="#475569" />
          </TouchableOpacity>"""
sort_btn_new = """          <TouchableOpacity 
            style={[styles.sortButton, sortBy !== 'none' && { borderColor: '#6366F1', backgroundColor: '#EEF2FF' }]} 
            activeOpacity={0.7}
            onPress={toggleSort}
          >
            <ArrowUpDown size={20} color={sortBy !== 'none' ? '#6366F1' : '#475569'} />
            {sortBy !== 'none' && (
              <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#6366F1', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>
                  {sortBy === 'priceDesc' ? '$$$' : sortBy === 'priceAsc' ? '$' : 'Data'}
                </Text>
              </View>
            )}
          </TouchableOpacity>"""
code = code.replace(sort_btn_old, sort_btn_new)

with open('src/screens/SubscriptionListScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done sorting logic")
