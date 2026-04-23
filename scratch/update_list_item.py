import re

with open('src/screens/SubscriptionListItem.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("status: 'active' | 'cancelled';", "status: 'active' | 'cancelled';\n  splitWith?: number;")
code = code.replace("import { Pause, Trash2 }", "import { Pause, Trash2, Users }")

old_price = '''        <Text style={[styles.amount, isCancelled && styles.textMuted]}>
          {item.amount.toFixed(2)} {item.currency}
        </Text>'''

new_price = '''        {item.splitWith && item.splitWith > 1 ? (
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Users size={12} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '500' }}>1/{item.splitWith}</Text>
            </View>
            <Text style={[styles.amount, isCancelled && styles.textMuted]}>
              {(item.amount / item.splitWith).toFixed(2)} {item.currency}
            </Text>
          </View>
        ) : (
          <Text style={[styles.amount, isCancelled && styles.textMuted]}>
            {item.amount.toFixed(2)} {item.currency}
          </Text>
        )}'''

code = code.replace(old_price, new_price)

with open('src/screens/SubscriptionListItem.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated ListItem')
