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

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme, type AppTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/themeUtils';
import { getSubscriptionDisplayStatus, getSubscriptionDisplayStatusTone } from '../utils/subscriptionDisplayStatus';
import type { SubscriptionStatus } from '../types/api';

export interface SubscriptionItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  nextPaymentDate: string;
  cycle: string;
  status: SubscriptionStatus;
  isTrial?: boolean;
  isSeasonal?: boolean;
  seasonEndLabel?: string | null;
}

interface Props {
  item: SubscriptionItem;
  /** Semantycznie: anuluj subskrypcję (soft cancel) */
  onDelete: (id: string) => void;
  /** Semantycznie: oznacz jako opłaconą */
  onPause: (id: string) => void;
  onPress?: () => void;
}

function getCategoryStyle(category: string, theme: AppTheme) {
  const key = category.toLowerCase();
  const color =
    key === 'rozrywka' ? theme.colors.primary :
    key === 'narzędzia' ? theme.colors.cyan :
    key === 'zdrowie' ? theme.colors.success :
    key === 'edukacja' ? theme.colors.warning :
    key === 'produktywność' ? theme.colors.pink :
    key === 'zakupy' ? theme.colors.warning :
    key === 'finanse' ? theme.colors.textMuted :
    key === 'transport' ? theme.colors.cyan :
    theme.colors.textMuted;

  return { bg: withAlpha(color, 0.16), text: color };
}

function getSubscriptionCardTone(
  status: SubscriptionItem['status'],
  isTrial: boolean | undefined,
  theme: AppTheme
) {
  const displayStatus = getSubscriptionDisplayStatus({ status, isTrial });
  return getSubscriptionDisplayStatusTone(theme, displayStatus);
}

const SubscriptionListItemComponent: React.FC<Props> = ({ item, onDelete, onPause, onPress }) => {
  const { theme } = useTheme();
  const safeItem: SubscriptionItem = useMemo(() => ({
    ...item,
    name: item.name || 'Subskrypcja',
    category: item.category || 'Inne',
    amount: Number(item.amount || 0),
    currency: item.currency || 'PLN',
    nextPaymentDate: item.nextPaymentDate || '-',
    cycle: item.cycle || 'Co miesiąc',
    status: item.status || 'pending',
    isTrial: Boolean(item.isTrial),
    isSeasonal: Boolean(item.isSeasonal),
    seasonEndLabel: item.seasonEndLabel || null,
  }), [item]);
  const catStyle = getCategoryStyle(safeItem.category, theme);
  const isCancelled = getSubscriptionDisplayStatus(safeItem) === 'canceled';
  const canMarkAsPaid = !isCancelled && !safeItem.isTrial;
  const cardTone = getSubscriptionCardTone(safeItem.status, safeItem.isTrial, theme);

  const handlePayPress = useCallback(() => onPause(safeItem.id), [onPause, safeItem.id]);
  const handleCancelPress = useCallback(() => onDelete(safeItem.id), [onDelete, safeItem.id]);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [canMarkAsPaid ? -140 : -70, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    if (isCancelled) return null;

    return (
      <View style={[styles.actionsContainer, !canMarkAsPaid && styles.actionsContainerSingle]}>
        {/* Opłać — zielony */}
        {canMarkAsPaid && (
          <TouchableOpacity
            style={[styles.actionButton, styles.payAction, { backgroundColor: theme.colors.primary }]}
            onPress={handlePayPress}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.actionInner, { transform: [{ scale }] }]}>
              <CheckCircle size={22} color={theme.colors.darkText} />
              <Text style={[styles.actionText, { color: theme.colors.darkText }]}>Opłać</Text>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* Anuluj — czerwony */}
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelAction, { backgroundColor: theme.colors.danger }]}
          onPress={handleCancelPress}
          activeOpacity={0.8}
        >
          <Animated.View style={[styles.actionInner, { transform: [{ scale }] }]}>
            <XCircle size={22} color={theme.colors.darkText} />
            <Text style={[styles.actionText, { color: theme.colors.darkText }]}>Anuluj</Text>
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
        style={[
          styles.rowContainer,
          {
            backgroundColor: cardTone.cardBg,
            borderColor: cardTone.border,
            shadowColor: cardTone.shadow,
            shadowOpacity: cardTone.muted ? 0.08 : 0.18,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.statusRail, { backgroundColor: cardTone.rail }]} />
        {/* Avatar */}
        <View
          style={[
            styles.avatar,
            { backgroundColor: isCancelled ? cardTone.badgeBg : catStyle.bg },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { color: isCancelled ? theme.colors.textSubtle : catStyle.text },
            ]}
          >
            {safeItem.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Środek — nazwa + status + data */}
        <View style={styles.middleContent}>
          <Text
            style={[styles.name, { color: theme.colors.text }, isCancelled && { color: theme.colors.textSubtle, textDecorationLine: 'line-through' }]}
            numberOfLines={2}
          >
            {safeItem.name}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: cardTone.badgeBg, borderColor: cardTone.border }]}>
              <Text style={[styles.statusBadgeText, { color: cardTone.accent }]} numberOfLines={1}>
                {cardTone.label}
              </Text>
            </View>
            {safeItem.isSeasonal && (
              <View style={[styles.seasonalBadge, { backgroundColor: withAlpha(theme.colors.cyan, 0.13), borderColor: withAlpha(theme.colors.cyan, 0.32) }]}>
                <Text style={[styles.seasonalBadgeText, { color: theme.colors.cyan }]}>Sezon</Text>
              </View>
            )}
          </View>
          <Text style={[styles.dateText, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {isCancelled
              ? 'Anulowana'
              : safeItem.isSeasonal && safeItem.seasonEndLabel
                ? `${safeItem.seasonEndLabel} · następna: ${safeItem.nextPaymentDate}`
                : `Następna: ${safeItem.nextPaymentDate}`}
          </Text>
        </View>

        {/* Prawa strona — kwota + cykl */}
        <View style={styles.rightContent}>
          <Text
            style={[styles.amount, { color: theme.colors.text }, isCancelled && { color: theme.colors.textSubtle, textDecorationLine: 'line-through' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {safeItem.amount.toFixed(2)} {safeItem.currency}
          </Text>
          <View style={[styles.cycleBadge, { backgroundColor: withAlpha(cardTone.accent, cardTone.muted ? 0.07 : 0.12) }]}>
            <Text style={[styles.cycleText, { color: theme.colors.textMuted }]} numberOfLines={1}>{safeItem.cycle}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: vibrantTheme.colors.card,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    shadowColor: vibrantTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 2,
  },
  statusRail: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
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
  actionsContainerSingle: {
    width: 70,
  },
  actionButton: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionInner: {
    alignItems: 'center',
  },
  payAction: {},
  cancelAction: {},
  actionText: {
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
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  seasonalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 5,
    borderWidth: 1,
  },
  seasonalBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});

const SubscriptionListItem = React.memo(SubscriptionListItemComponent);

export default SubscriptionListItem;
