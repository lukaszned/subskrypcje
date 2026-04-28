import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, Search } from 'lucide-react-native';

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
  const theme = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textDim: isDark ? '#94A3B8' : '#64748B',
    card: isDark ? '#1E293B' : '#FFFFFF',
    iconBg: isDark ? '#334155' : '#EEF2FF',
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
        {type === 'search' ? (
          <Search size={40} color="#6366F1" />
        ) : (
          <Plus size={40} color="#6366F1" />
        )}
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textDim }]}>{message}</Text>
      
      {onAction && actionLabel && (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
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
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
