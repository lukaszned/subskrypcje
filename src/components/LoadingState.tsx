// =============================================================
// src/components/LoadingState.tsx
//
// Animowany skeleton placeholder — używany podczas ładowania danych.
// Przyjmuje dowolny layout przez children lub domyślny preset.
// =============================================================

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/themeUtils';

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
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.68, duration: 850, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.32, duration: 850, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(translateX, { toValue: 1, duration: 1700, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: -1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, translateX]);

  const backgroundColor = isDark ? theme.colors.cardStrong : withAlpha(theme.colors.primary, 0.09);
  const shimmerColor = isDark ? withAlpha(theme.colors.text, 0.14) : withAlpha(theme.colors.primary, 0.14);
  const shimmerTranslate = translateX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-80, 120],
  });

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor, borderRadius, opacity, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            backgroundColor: shimmerColor,
            transform: [{ translateX: shimmerTranslate }, { rotate: '12deg' }],
          },
        ]}
      />
    </Animated.View>
  );
};

// ─── Preset: lista wierszy ────────────────────────────────────

export const SkeletonList: React.FC<{ rows?: number, isDark?: boolean }> = ({ rows = 4, isDark }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.listContainer}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.row, { borderBottomColor: isDark ? theme.colors.borderStrong : theme.colors.border }]}>
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
};

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
  },
  avatar: { marginRight: 16 },
  rowContent: { flex: 1, marginRight: 12 },
  mb8: { marginBottom: 8 },
  cardsRow: { flexDirection: 'row', paddingHorizontal: 4 },
  card: { marginRight: 16 },
  shimmer: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 42,
  },
});
