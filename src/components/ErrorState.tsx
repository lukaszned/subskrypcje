import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react-native';
import type { AppTheme } from '../theme/ThemeContext';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/themeUtils';
import { PressableScale } from './PressableScale';

interface ErrorStateProps {
  message?: string;
  details?: string;
  onRetry?: () => void;
  onSignOut?: () => void;
  isDark?: boolean;
}

export const ErrorState = ({
  message = 'Nie udało się odświeżyć danych. Pokazujemy bezpieczny stan aplikacji.',
  details,
  onRetry,
  onSignOut,
  isDark,
}: ErrorStateProps) => {
  const { theme: appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const resolvedDark = isDark ?? true;
  const localTheme = {
    bg: appTheme.colors.bg,
    text: appTheme.colors.text,
    textDim: appTheme.colors.textMuted,
    card: resolvedDark ? appTheme.colors.card : appTheme.colors.cardStrong,
    border: appTheme.colors.border,
  };

  return (
    <View style={[styles.container, { backgroundColor: localTheme.bg }]}>
      <View style={[styles.card, { backgroundColor: localTheme.card, borderColor: localTheme.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${appTheme.colors.warning}1F` }]}>
          <AlertCircle size={34} color={appTheme.colors.warning} />
        </View>
        <Text style={[styles.title, { color: localTheme.text }]}>Nie udało się odświeżyć danych</Text>
        <Text style={[styles.message, { color: localTheme.textDim }]}>{message}</Text>

        <View style={[styles.cacheHint, { borderColor: localTheme.border }]}>
          <ShieldCheck size={16} color={appTheme.colors.primary} />
          <Text style={[styles.cacheHintText, { color: localTheme.textDim }]}>
            Jeśli mamy zapisany stan, aplikacja pokaże ostatnie dostępne dane.
          </Text>
        </View>

        {details && (
          <View style={[styles.detailsContainer, { backgroundColor: withAlpha(appTheme.colors.text, resolvedDark ? 0.05 : 0.08) }]}>
            <Text style={[styles.detailsText, { color: localTheme.textDim }]}>{details}</Text>
          </View>
        )}

        <View style={styles.retryContainer}>
          {onRetry && (
            <PressableScale
              style={[styles.button, { backgroundColor: appTheme.colors.primary, shadowColor: appTheme.colors.primary }]}
              onPress={onRetry}
            >
              <RefreshCw size={20} color={appTheme.colors.darkText} style={{ marginRight: 8 }} />
              <Text style={[styles.buttonText, { color: appTheme.colors.darkText }]}>Spróbuj ponownie</Text>
            </PressableScale>
          )}

          {onSignOut && (
            <PressableScale
              style={[styles.button, styles.buttonSecondary, { borderColor: localTheme.border }]}
              onPress={onSignOut}
            >
              <Text style={[styles.buttonText, { color: localTheme.textDim }]}>Wyloguj się</Text>
            </PressableScale>
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    padding: 28,
    borderRadius: 26,
    alignItems: 'center',
    shadowColor: theme.colors.bg,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 5,
    borderWidth: 1,
  },
  retryContainer: {
    width: '100%',
    gap: 12,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  cacheHint: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 18,
    backgroundColor: withAlpha(theme.colors.text, 0.04),
  },
  cacheHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 7,
  },
  buttonSecondary: {
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
  },
  detailsContainer: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailsText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
});
