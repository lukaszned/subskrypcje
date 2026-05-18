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
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';

export interface SubscriptionItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  nextPaymentDate: string;
  cycle: string;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  isTrial?: boolean;
}

interface Props {
  item: SubscriptionItem;
  /** Semantycznie: anuluj subskrypcję (soft cancel) */
  onDelete: (id: string) => void;
  /** Semantycznie: oznacz jako opłaconą */
  onPause: (id: string) => void;
  onPress?: () => void;
}

// Mapowanie etykiet kategorii -> kolor tła awatara
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'rozrywka':     { bg: '#E0E7FF', text: '#4F46E5' },
  'narzędzia':    { bg: '#DBEAFE', text: '#2563EB' },
  'zdrowie':      { bg: '#F1F5F9', text: '#334155' },
  'edukacja':     { bg: '#FEF9C3', text: '#CA8A04' },
  'produktywność':{ bg: '#FCE7F3', text: '#BE185D' },
  'zakupy':       { bg: '#FEF3C7', text: '#D97706' },
  'finanse':      { bg: '#F8FAFC', text: '#334155' },
  'transport':    { bg: '#F0F9FF', text: '#0284C7' },
  'inne':         { bg: '#F1F5F9', text: '#64748B' },
};

function getCategoryStyle(category: string) {
  const key = category.toLowerCase();
  return CATEGORY_COLORS[key] ?? { bg: '#F1F5F9', text: '#64748B' };
}

const SubscriptionListItem: React.FC<Props> = ({ item, onDelete, onPause, onPress }) => {
  const { theme } = useTheme();
  const safeItem: SubscriptionItem = {
    ...item,
    name: item.name || 'Subskrypcja',
    category: item.category || 'Inne',
    amount: Number(item.amount || 0),
    currency: item.currency || 'PLN',
    nextPaymentDate: item.nextPaymentDate || '-',
    cycle: item.cycle || 'Co miesiąc',
    status: item.status || 'pending',
    isTrial: Boolean(item.isTrial),
  };
  const catStyle = getCategoryStyle(safeItem.category);
  const isCancelled = safeItem.status === 'canceled';

  const getStatusInfo = (status: string, isTrial?: boolean) => {
    if (isTrial) return { label: 'Trial', color: '#F59E0B', bg: '#FFFBEB' };
    switch (status) {
      case 'paid': return { label: 'Opłacona', color: theme.colors.primary, bg: `${theme.colors.primary}18` };
      case 'overdue': return { label: 'Zaległa', color: '#EF4444', bg: '#FEE2E2' };
      case 'canceled': return { label: 'Anulowana', color: '#64748B', bg: '#F1F5F9' };
      default: return { label: 'Aktywna', color: '#6366F1', bg: '#EEF2FF' };
    }
  };

  const statusInfo = getStatusInfo(safeItem.status, safeItem.isTrial);

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
          style={[styles.actionButton, styles.payAction, { backgroundColor: theme.colors.primary }]}
          onPress={() => onPause(safeItem.id)}
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
          onPress={() => onDelete(safeItem.id)}
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
      <TouchableOpacity 
        style={[styles.rowContainer, isCancelled && styles.rowContainerCancelled]}
        onPress={onPress}
        activeOpacity={0.7}
      >
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
            {safeItem.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Środek — nazwa + status + data */}
        <View style={styles.middleContent}>
          <Text
            style={[styles.name, isCancelled && styles.textCancelled]}
            numberOfLines={2}
          >
            {safeItem.name}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusInfo.color }]} numberOfLines={1}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText} numberOfLines={1}>
            {isCancelled ? 'Anulowana' : `Następna: ${safeItem.nextPaymentDate}`}
          </Text>
        </View>

        {/* Prawa strona — kwota + cykl */}
        <View style={styles.rightContent}>
          <Text
            style={[styles.amount, isCancelled && styles.textCancelled]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {safeItem.amount.toFixed(2)} {safeItem.currency}
          </Text>
          <View style={styles.cycleBadge}>
            <Text style={styles.cycleText} numberOfLines={1}>{safeItem.cycle}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: vibrantTheme.colors.card,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 2,
  },
  rowContainerCancelled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  middleContent: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: vibrantTheme.colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  textCancelled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  dateText: {
    fontSize: 13,
    color: vibrantTheme.colors.textMuted,
    fontWeight: '500',
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 104,
    maxWidth: 126,
    paddingTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: vibrantTheme.colors.text,
    marginBottom: 4,
    textAlign: 'right',
  },
  cycleBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cycleText: {
    fontSize: 11,
    fontWeight: '600',
    color: vibrantTheme.colors.textMuted,
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
    backgroundColor: '#CBD5E1',
  },
  cancelAction: {
    backgroundColor: '#FF3B6B',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusRow: {
    alignItems: 'flex-start',
  },
});

export default SubscriptionListItem;
