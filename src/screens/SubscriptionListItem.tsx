// =============================================================
// src/screens/SubscriptionListItem.tsx
//
// Komponent wiersza listy subskrypcji.
//
// SWIPE ACTIONS:
//   - status === 'active':
//       - prawy przycisk 1: Opłać (zielony) — wywołuje onPause(id)
//       - prawy przycisk 2: Anuluj (czerwony) — wywołuje onDelete(id)
//   - status === 'cancelled':
//       - tylko wyświetlenie (bez akcji swipe)
//
// UWAGA: nazwy props (onDelete, onPause) zachowane dla kompatybilności
// z istniejącym SubscriptionListScreen. Semantycznie:
//   - onPause = oznacz jako opłacone (PATCH /subscriptions/:id/pay)
//   - onDelete = anuluj subskrypcję  (PATCH /subscriptions/:id/cancel)
// =============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { CheckCircle, XCircle } from 'lucide-react-native';

export interface SubscriptionItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  nextPaymentDate: string;
  cycle: string;
  status: 'active' | 'cancelled';
}

interface Props {
  item: SubscriptionItem;
  /** Semantycznie: anuluj subskrypcję (soft cancel) */
  onDelete: (id: string) => void;
  /** Semantycznie: oznacz jako opłaconą */
  onPause: (id: string) => void;
}

// Mapowanie etykiet kategorii -> kolor tła awatara
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'rozrywka':     { bg: '#E0E7FF', text: '#4F46E5' },
  'narzędzia':    { bg: '#DBEAFE', text: '#2563EB' },
  'zdrowie':      { bg: '#DCFCE7', text: '#16A34A' },
  'edukacja':     { bg: '#FEF9C3', text: '#CA8A04' },
  'produktywność':{ bg: '#FCE7F3', text: '#BE185D' },
  'zakupy':       { bg: '#FEF3C7', text: '#D97706' },
  'finanse':      { bg: '#ECFDF5', text: '#059669' },
  'transport':    { bg: '#F0F9FF', text: '#0284C7' },
  'inne':         { bg: '#F1F5F9', text: '#64748B' },
};

function getCategoryStyle(category: string) {
  const key = category.toLowerCase();
  return CATEGORY_COLORS[key] ?? { bg: '#F1F5F9', text: '#64748B' };
}

const SubscriptionListItem: React.FC<Props> = ({ item, onDelete, onPause }) => {
  const catStyle = getCategoryStyle(item.category);
  const isCancelled = item.status === 'cancelled';

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-140, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    if (isCancelled) return null;

    return (
      <View style={styles.actionsContainer}>
        {/* Opłać — zielony */}
        <TouchableOpacity
          style={[styles.actionButton, styles.payAction]}
          onPress={() => onPause(item.id)}
          activeOpacity={0.8}
        >
          <Animated.View style={[styles.actionInner, { transform: [{ scale }] }]}>
            <CheckCircle size={22} color="#FFFFFF" />
            <Text style={styles.actionText}>Opłać</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Anuluj — czerwony */}
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelAction]}
          onPress={() => onDelete(item.id)}
          activeOpacity={0.8}
        >
          <Animated.View style={[styles.actionInner, { transform: [{ scale }] }]}>
            <XCircle size={22} color="#FFFFFF" />
            <Text style={styles.actionText}>Anuluj</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      renderRightActions={isCancelled ? undefined : renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <View style={[styles.rowContainer, isCancelled && styles.rowContainerCancelled]}>
        {/* Avatar */}
        <View
          style={[
            styles.avatar,
            { backgroundColor: isCancelled ? '#F1F5F9' : catStyle.bg },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { color: isCancelled ? '#94A3B8' : catStyle.text },
            ]}
          >
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Środek — nazwa + data */}
        <View style={styles.middleContent}>
          <Text
            style={[styles.name, isCancelled && styles.textCancelled]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={styles.dateText}>
            {isCancelled ? 'Anulowana' : `Następna: ${item.nextPaymentDate}`}
          </Text>
        </View>

        {/* Prawa strona — kwota + cykl */}
        <View style={styles.rightContent}>
          <Text style={[styles.amount, isCancelled && styles.textCancelled]}>
            {item.amount.toFixed(2)} {item.currency}
          </Text>
          <View style={styles.cycleBadge}>
            <Text style={styles.cycleText}>{item.cycle}</Text>
          </View>
        </View>
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rowContainerCancelled: {
    backgroundColor: '#FAFAFA',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  middleContent: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  textCancelled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  dateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cycleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cycleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  // Swipe actions
  actionsContainer: {
    flexDirection: 'row',
    width: 140,
  },
  actionButton: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionInner: {
    alignItems: 'center',
  },
  payAction: {
    backgroundColor: '#10B981', // emerald-500
  },
  cancelAction: {
    backgroundColor: '#EF4444', // red-500
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

export default SubscriptionListItem;
