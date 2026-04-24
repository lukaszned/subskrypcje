import re

with open('src/screens/SubscriptionListScreen.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add useSubscriptionStore import
code = code.replace("import SubscriptionListItem, { SubscriptionItem } from './SubscriptionListItem';",
                    "import SubscriptionListItem, { SubscriptionItem } from './SubscriptionListItem';\nimport { useSubscriptionStore } from '../store/subscriptionStore';")

# Remove INITIAL_DATA
code = re.sub(r'const INITIAL_DATA: SubscriptionItem\[\] = \[\s*\{.*?\}\s*\];', '', code, flags=re.DOTALL)

# Replace data state with store connection
state_old = "const [data, setData] = useState<SubscriptionItem[]>(INITIAL_DATA);"
state_new = """  const data = useSubscriptionStore((state) => state.subscriptions);
  const togglePause = useSubscriptionStore((state) => state.togglePauseSubscription);
  const deleteSub = useSubscriptionStore((state) => state.removeSubscription);"""
code = code.replace(state_old, state_new)

# Update handlers
handle_del_old = """  const handleDelete = (id: string) => {
    // Symulacja usuwania wiersza (usuwamy ze stanu lokalnego)
    setData(prev => prev.filter(item => item.id !== id));
  };"""
handle_del_new = """  const handleDelete = (id: string) => {
    deleteSub(id);
  };"""
code = code.replace(handle_del_old, handle_del_new)

handle_pause_old = """  const handlePause = (id: string) => {
    // Symulacja pauzowania -> przeniesienie do "cancelled" dla testów
    setData(prev => prev.map(item => item.id === id ? { ...item, status: 'cancelled' } : item));
  };"""
handle_pause_new = """  const handlePause = (id: string) => {
    togglePause(id);
  };"""
code = code.replace(handle_pause_old, handle_pause_new)

with open('src/screens/SubscriptionListScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated SubscriptionListScreen")
