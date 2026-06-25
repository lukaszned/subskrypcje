import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { PressableScale } from '../PressableScale';

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
};

export function GlassCard({ children, style, strong = false }: GlassCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: strong ? theme.colors.cardStrong : theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.bg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function SectionHeader({ eyebrow, title, subtitle, right }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{eyebrow}</Text> : null}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  icon: Icon,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const { theme } = useTheme();
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';
  const accent = isDanger ? theme.colors.danger : theme.colors.primary;
  const textColor = isGhost ? accent : theme.colors.darkText;

  return (
    <PressableScale
      style={[
        styles.button,
        {
          backgroundColor: isGhost ? `${accent}16` : accent,
          borderColor: isGhost ? `${accent}44` : 'transparent',
          opacity: disabled ? 0.55 : 1,
          shadowColor: accent,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {Icon ? <Icon size={18} color={textColor} /> : null}
          <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
        </>
      )}
    </PressableScale>
  );
}

type MetricTileProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: 'primary' | 'warning' | 'danger' | 'muted';
  style?: StyleProp<ViewStyle>;
};

export function MetricTile({ label, value, icon: Icon, tone = 'primary', style }: MetricTileProps) {
  const { theme } = useTheme();
  const accent = tone === 'warning'
    ? theme.colors.warning
    : tone === 'danger'
      ? theme.colors.danger
      : tone === 'muted'
        ? theme.colors.textMuted
        : theme.colors.primary;

  return (
    <GlassCard style={[styles.metricTile, style]}>
      <View style={[styles.metricIcon, { backgroundColor: `${accent}18`, borderColor: `${accent}33` }]}>
        {Icon ? <Icon size={17} color={accent} /> : null}
      </View>
      <Text style={[styles.metricValue, { color: theme.colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 12,
  },
  sectionCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  button: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  metricTile: {
    flex: 1,
    minHeight: 104,
    justifyContent: 'space-between',
    padding: 14,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 10,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
});
