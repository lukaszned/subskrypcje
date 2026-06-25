import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CloudOff, RotateCw, WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/themeUtils';

interface NetworkStatusBannerProps {
  onRetry?: () => void;
}

export function NetworkStatusBanner({ onRetry }: NetworkStatusBannerProps) {
  const network = useNetworkStatus();
  const { theme } = useTheme();
  const lastFailureAt = network.lastFailureAt ?? 0;
  const lastSuccessAt = network.lastSuccessAt ?? 0;
  const lastFailureIsOld = lastFailureAt > 0 && Date.now() - lastFailureAt > 20000;

  if (
    network.status === 'slow' &&
    network.activeRequests === 0 &&
    (lastSuccessAt >= lastFailureAt || lastFailureIsOld)
  ) {
    return null;
  }

  if (network.status === 'online' || network.status === 'unknown') {
    return null;
  }

  const isOffline = network.status === 'offline';
  const title = isOffline ? 'Brak połączenia' : 'Połączenie jest wolniejsze';
  const description = network.message || (
    isOffline
      ? 'Możesz korzystać z zapisanych danych. Zmiany zsynchronizują się po powrocie sieci.'
      : 'Pokazujemy zapisane dane. Aktualizacja zakończy się w tle.'
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: withAlpha(isOffline ? theme.colors.danger : theme.colors.warning, 0.13),
          borderColor: withAlpha(isOffline ? theme.colors.danger : theme.colors.warning, 0.28),
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.cardStrong }]}>
        {isOffline ? (
          <WifiOff size={18} color={theme.colors.danger} />
        ) : network.activeRequests > 0 ? (
          <ActivityIndicator size="small" color={theme.colors.warning} />
        ) : (
          <CloudOff size={18} color={theme.colors.warning} />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.colors.textMuted }]}>{description}</Text>
      </View>
      {onRetry && (
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: withAlpha(theme.colors.primary, 0.1) }]} onPress={onRetry} activeOpacity={0.8}>
          <RotateCw size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
  },
  description: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 2,
  },
  retryButton: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
