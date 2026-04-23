import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Pause, Trash2 } from 'lucide-react-native';

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
  onDelete: (id: string) => void;
  onPause: (id: string) => void;
}

const SubscriptionListItem: React.FC<Props> = ({ item, onDelete, onPause }) => {
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'rozrywka': return '#E0E7FF'; // indigo-100
      case 'muzyka': return '#FEF08A'; // yellow-200
      case 'narzędzia': return '#DBEAFE'; // blue-100
      case 'zdrowie': return '#DCFCE7'; // green-100
      default: return '#F1F5F9'; // slate-100
    }
  };

  const getCategoryTextColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'rozrywka': return '#4F46E5'; // indigo-600
      case 'muzyka': return '#CA8A04'; // yellow-600
      case 'narzędzia': return '#2563EB'; // blue-600
      case 'zdrowie': return '#16A34A'; // green-600
      default: return '#64748B'; // slate-500
    }
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsContainer}>
        {item.status === 'active' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.pauseAction]}
            onPress={() => onPause(item.id)}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale }] }}>
              <Pause size={24} color="#FFFFFF" />
              <Text style={styles.actionText}>Pauzuj</Text>
            </Animated.View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteAction]}
          onPress={() => onDelete(item.id)}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Trash2 size={24} color="#FFFFFF" />
            <Text style={styles.actionText}>Usuń</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const isCancelled = item.status === 'cancelled';

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <View style={[styles.rowContainer, isCancelled && styles.rowContainerCancelled]}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: getCategoryColor(item.category) },
            isCancelled && { backgroundColor: '#F1F5F9', opacity: 0.6 }
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { color: getCategoryTextColor(item.category) },
              isCancelled && { color: '#94A3B8' }
            ]}
          >
            {item.name.charAt(0)}
          </Text>
        </View>

        <View style={styles.middleContent}>
          <Text style={[styles.name, isCancelled && styles.textCancelled]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.dateText}>Kolejna płatność: {item.nextPaymentDate}</Text>
        </View>

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
    borderBottomColor: '#F8FAFC', // Bardzo delikatny separator
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
  // Akcje Swipeable
  actionsContainer: {
    flexDirection: 'row',
    width: 140, // 70px per action
  },
  actionButton: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseAction: {
    backgroundColor: '#F59E0B', // amber-500
  },
  deleteAction: {
    backgroundColor: '#EF4444', // red-500
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default SubscriptionListItem;
