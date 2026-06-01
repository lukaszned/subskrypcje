import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Plus, Search, Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/themeUtils';
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
    text: appTheme.colors.text,
    textDim: appTheme.colors.textMuted,
    card: isDark === false ? appTheme.colors.cardStrong : appTheme.colors.card,
    border: appTheme.colors.border,
    iconBg: withAlpha(appTheme.colors.primary, isDark === false ? 0.12 : 0.16),
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
