import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, Search } from 'lucide-react-native';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';

interface EmptyStateProps {
  title: string;
  message: string;
  onAction?: () => void;
  actionLabel?: string;
  isDark?: boolean;
  type?: 'search' | 'add';
}

export const EmptyState = ({ 
  title, 
  message, 
  onAction, 
  actionLabel, 
  isDark,
  type = 'add'
}: EmptyStateProps) => {
  const { theme: appTheme } = useTheme();
  const localTheme = {
    bg: isDark === false ? '#F8FAFC' : appTheme.colors.bg,
    text: isDark === false ? '#0F172A' : appTheme.colors.text,
    textDim: isDark === false ? '#64748B' : appTheme.colors.textMuted,
    card: isDark === false ? '#FFFFFF' : appTheme.colors.card,
    iconBg: isDark === false ? `${appTheme.colors.primary}16` : `${appTheme.colors.primary}1F`,
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: localTheme.iconBg }]}>
        {type === 'search' ? (
          <Search size={40} color={appTheme.colors.primary} />
        ) : (
          <Plus size={40} color={appTheme.colors.primary} />
        )}
      </View>
      <Text style={[styles.title, { color: localTheme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: localTheme.textDim }]}>{message}</Text>
      
      {onAction && actionLabel && (
        <TouchableOpacity style={[styles.button, { backgroundColor: appTheme.colors.primary, shadowColor: appTheme.colors.primary }]} onPress={onAction} activeOpacity={0.8}>
          <Text style={[styles.buttonText, { color: appTheme.colors.darkText }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: vibrantTheme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    shadowColor: vibrantTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonText: {
    color: vibrantTheme.colors.darkText,
    fontSize: 16,
    fontWeight: '700',
  },
});
