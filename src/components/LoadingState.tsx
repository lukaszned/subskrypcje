// =============================================================
// src/components/LoadingState.tsx
//
// Animowany skeleton placeholder — używany podczas ładowania danych.
// Przyjmuje dowolny layout przez children lub domyślny preset.
// =============================================================

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width: ViewStyle['width'];
  height: ViewStyle['height'];
  borderRadius?: number;
  style?: ViewStyle;
  isDark?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = 8,
  style,
  isDark = false,
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

  const backgroundColor = isDark ? '#334155' : '#E2E8F0';

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor, borderRadius, opacity },
        style,
      ]}
    />
  );
};

// ─── Preset: lista wierszy ────────────────────────────────────

export const SkeletonList: React.FC<{ rows?: number, isDark?: boolean }> = ({ rows = 4, isDark }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={[styles.row, isDark && { borderBottomColor: '#1E293B' }]}>
        <Skeleton width={48} height={48} borderRadius={24} style={styles.avatar} isDark={isDark} />
        <View style={styles.rowContent}>
          <Skeleton width={140} height={16} style={styles.mb8} isDark={isDark} />
          <Skeleton width={90} height={12} isDark={isDark} />
        </View>
        <Skeleton width={70} height={20} borderRadius={6} isDark={isDark} />
      </View>
    ))}
  </View>
);

// ─── Preset: karty poziome ────────────────────────────────────

export const SkeletonCards: React.FC<{ count?: number, isDark?: boolean }> = ({ count = 3, isDark }) => (
  <View style={styles.cardsRow}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} width={140} height={110} borderRadius={16} style={styles.card} isDark={isDark} />
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
