import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CloudOff, RotateCw, WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { vibrantTheme } from '../theme/vibrantTheme';

interface NetworkStatusBannerProps {
  onRetry?: () => void;
}

export function NetworkStatusBanner({ onRetry }: NetworkStatusBannerProps) {
  const network = useNetworkStatus();

  if (network.status === 'online' || network.status === 'unknown') {
    return null;
  }

  const isOffline = network.status === 'offline';
  const title = isOffline ? 'Brak połączenia z API' : 'API odpowiada wolno';
  const description = network.message || (
    isOffline
      ? 'Sprawdź sieć telefonu albo uruchom backend.'
      : 'Pokazujemy ekran i czekamy na odpowiedź backendu.'
  );

  return (
    <View style={[styles.container, isOffline ? styles.offline : styles.slow]}>
      <View style={styles.iconWrap}>
        {isOffline ? (
          <WifiOff size={18} color="#B91C1C" />
        ) : network.activeRequests > 0 ? (
          <ActivityIndicator size="small" color="#B45309" />
        ) : (
          <CloudOff size={18} color="#B45309" />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <RotateCw size={16} color="#0B6B3A" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  slow: {
    backgroundColor: 'rgba(251,191,36,0.13)',
    borderColor: 'rgba(251,191,36,0.28)',
  },
  offline: {
    backgroundColor: 'rgba(255,77,109,0.13)',
    borderColor: 'rgba(255,77,109,0.28)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: vibrantTheme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  description: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 2,
  },
  retryButton: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
