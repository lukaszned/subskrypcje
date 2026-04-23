import re

with open('src/screens/SubscriptionListScreen.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace INITIAL_DATA with store usage
code = code.replace("import SubscriptionListItem, { SubscriptionItem } from './SubscriptionListItem';", "import SubscriptionListItem, { SubscriptionItem } from './SubscriptionListItem';\nimport { useSubscriptionStore } from '../store/useSubscriptionStore';")

# Remove INITIAL_DATA block
code = re.sub(r"const INITIAL_DATA: SubscriptionItem\[] = \[\s*\{.*?\},\s*\];\n", "", code, flags=re.MULTILINE|re.DOTALL)
# Actually the regex might fail if it's multiple lines. Let's just rely on replace:
code = re.sub(r"const INITIAL_DATA: SubscriptionItem\[\] = \[.*?\];", "", code, flags=re.MULTILINE|re.DOTALL)

state_code = """
  const { subscriptions, removeSubscription, togglePauseStatus } = useSubscriptionStore();
  const data = subscriptions;
"""
code = code.replace("  const [data, setData] = useState<SubscriptionItem[]>(INITIAL_DATA);", state_code)

handlers_old = """  const handleDelete = (id: string) => {
    // Symulacja usuwania wiersza (usuwamy ze stanu lokalnego)
    setData(prev => prev.filter(item => item.id !== id));
  };

  const handlePause = (id: string) => {
    // Symulacja pauzowania -> przeniesienie do "cancelled" dla testów
    setData(prev => prev.map(item => item.id === id ? { ...item, status: 'cancelled' } : item));
  };"""

handlers_new = """  const handleDelete = (id: string) => {
    removeSubscription(id);
  };

  const handlePause = (id: string) => {
    togglePauseStatus(id);
  };"""

code = code.replace(handlers_old, handlers_new)

with open('src/screens/SubscriptionListScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated ListScreen')
