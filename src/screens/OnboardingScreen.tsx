import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types/navigation';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { theme } = useTheme();

  return (
    <LinearGradient colors={theme.gradients.app} style={styles.container}>
      <View style={[styles.glowOne, { backgroundColor: `${theme.colors.primary}2E` }]} />
      <View style={[styles.glowTwo, { backgroundColor: `${theme.colors.cyan}33` }]} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <LinearGradient colors={theme.gradients.glass} style={[styles.iconContainer, { borderColor: theme.colors.border }]}>
            <Text style={[styles.icon, { color: theme.colors.text }]}>$</Text>
          </LinearGradient>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Premium subscription control</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>Sub-Sentry</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Zapanuj nad swoimi subskrypcjami i oszczędzaj pieniądze każdego miesiąca.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.86}
          >
            <LinearGradient colors={theme.gradients.primary} style={styles.buttonGradient}>
              <Text style={[styles.buttonText, { color: theme.colors.darkText }]}>Rozpocznij</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: vibrantTheme.colors.bg,
  },
  safe: {
    flex: 1,
  },
  glowOne: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width,
    backgroundColor: 'rgba(255,255,255,0.18)',
    top: -120,
    right: -120,
  },
  glowTwo: {
    position: 'absolute',
    width: width * 0.78,
    height: width * 0.78,
    borderRadius: width,
    backgroundColor: 'rgba(139,92,246,0.2)',
    bottom: 70,
    left: -120,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 108,
    height: 108,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    ...vibrantTheme.shadows.card,
  },
  icon: {
    fontSize: 52,
    fontWeight: '900',
    color: vibrantTheme.colors.text,
  },
  eyebrow: {
    color: vibrantTheme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 44,
    fontWeight: '900',
    color: vibrantTheme.colors.text,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: vibrantTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    ...vibrantTheme.shadows.glow,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: vibrantTheme.colors.darkText,
    fontSize: 18,
    fontWeight: '900',
  },
});
