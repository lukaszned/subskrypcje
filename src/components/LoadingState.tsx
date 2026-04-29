// =============================================================
// src/components/LoadingState.tsx
//
// Animowany skeleton placeholder — używany podczas ładowania danych.
// Przyjmuje dowolny layout przez children lub domyślny preset.
// =============================================================

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = 8,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, backgroundColor: '#E2E8F0', borderRadius, opacity },
        style,
      ]}
    />
  );
};

// ─── Preset: lista wierszy ────────────────────────────────────

export const SkeletonList: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={styles.row}>
        <Skeleton width={48} height={48} borderRadius={24} style={styles.avatar} />
        <View style={styles.rowContent}>
          <Skeleton width={140} height={16} style={styles.mb8} />
          <Skeleton width={90} height={12} />
        </View>
        <Skeleton width={70} height={20} borderRadius={6} />
      </View>
    ))}
  </View>
);

// ─── Preset: karty poziome ────────────────────────────────────

export const SkeletonCards: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.cardsRow}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} width={140} height={110} borderRadius={16} style={styles.card} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  listContainer: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  avatar: { marginRight: 16 },
  rowContent: { flex: 1, marginRight: 12 },
  mb8: { marginBottom: 8 },
  cardsRow: { flexDirection: 'row', paddingHorizontal: 4 },
  card: { marginRight: 16 },
});
