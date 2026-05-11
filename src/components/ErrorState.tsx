import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { vibrantTheme } from '../theme/vibrantTheme';

interface ErrorStateProps {
  message?: string;
  details?: string;
  onRetry?: () => void;
  onSignOut?: () => void;
  isDark?: boolean;
}

export const ErrorState = ({ message = 'Wystąpił nieoczekiwany błąd', details, onRetry, onSignOut, isDark }: ErrorStateProps) => {
  const resolvedDark = isDark ?? true;
  const theme = {
    bg: resolvedDark ? vibrantTheme.colors.bg : '#F8FAFC',
    text: resolvedDark ? vibrantTheme.colors.text : '#0F172A',
    textDim: resolvedDark ? vibrantTheme.colors.textMuted : '#64748B',
    card: resolvedDark ? vibrantTheme.colors.card : '#FFFFFF',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.iconContainer}>
          <AlertCircle size={48} color="#EF4444" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Ojej, coś poszło nie tak</Text>
        <Text style={[styles.message, { color: theme.textDim }]}>{message}</Text>
        
        {details && (
          <View style={[styles.detailsContainer, { backgroundColor: resolvedDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
            <Text style={[styles.detailsText, { color: theme.textDim }]}>{details}</Text>
          </View>
        )}
        
        <View style={styles.retryContainer}>
          {onRetry && (
            <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.8}>
              <RefreshCw size={20} color={vibrantTheme.colors.darkText} style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Spróbuj ponownie</Text>
            </TouchableOpacity>
          )}

          {onSignOut && (
            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]} 
              onPress={onSignOut} 
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: theme.textDim }]}>Wyloguj się</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  retryContainer: {
    width: '100%',
    gap: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,77,109,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: vibrantTheme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonSecondary: {
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  buttonText: {
    color: vibrantTheme.colors.darkText,
    fontSize: 16,
    fontWeight: '700',
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
