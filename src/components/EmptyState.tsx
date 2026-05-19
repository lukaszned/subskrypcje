import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Plus, Search, Sparkles } from 'lucide-react-native';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';
import { PressableScale } from './PressableScale';

interface EmptyStateProps {
  title: string;
  message: string;
  onAction?: () => void;
  actionLabel?: string;
  isDark?: boolean;
  type?: 'search' | 'add' | 'calm';
}

export const EmptyState = ({
  title,
  message,
  onAction,
  actionLabel,
  isDark,
  type = 'add',
}: EmptyStateProps) => {
  const { theme: appTheme } = useTheme();
  const localTheme = {
    text: isDark === false ? '#0F172A' : appTheme.colors.text,
    textDim: isDark === false ? '#64748B' : appTheme.colors.textMuted,
    card: isDark === false ? '#FFFFFF' : appTheme.colors.card,
    border: isDark === false ? '#E2E8F0' : appTheme.colors.border,
    iconBg: isDark === false ? `${appTheme.colors.primary}16` : `${appTheme.colors.primary}1F`,
  };
  const Icon = type === 'search' ? Search : type === 'calm' ? Sparkles : Plus;

  return (
    <View style={[styles.container, { backgroundColor: localTheme.card, borderColor: localTheme.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: localTheme.iconBg }]}>
        <Icon size={34} color={appTheme.colors.primary} />
      </View>
      <Text style={[styles.title, { color: localTheme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: localTheme.textDim }]}>{message}</Text>

      {onAction && actionLabel && (
        <PressableScale
          style={[styles.button, { backgroundColor: appTheme.colors.primary, shadowColor: appTheme.colors.primary }]}
          onPress={onAction}
        >
          <Text style={[styles.buttonText, { color: appTheme.colors.darkText }]}>{actionLabel}</Text>
        </PressableScale>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 26,
    borderWidth: 1,
  },
  iconContainer: {
    width: 78,
    height: 78,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: vibrantTheme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
