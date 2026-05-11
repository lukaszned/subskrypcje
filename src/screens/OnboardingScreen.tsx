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

const { width } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <LinearGradient colors={vibrantTheme.gradients.app} style={styles.container}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <LinearGradient colors={vibrantTheme.gradients.glass} style={styles.iconContainer}>
            <Text style={styles.icon}>$</Text>
          </LinearGradient>
          <Text style={styles.eyebrow}>Premium subscription control</Text>
          <Text style={styles.title}>Sub-Sentry</Text>
          <Text style={styles.subtitle}>
            Zapanuj nad swoimi subskrypcjami i oszczedzaj pieniadze kazdego miesiaca.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.86}
          >
            <LinearGradient colors={vibrantTheme.gradients.primary} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Rozpocznij</Text>
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
    backgroundColor: 'rgba(32,246,181,0.18)',
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
    borderRadius: 34,
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
    borderRadius: 30,
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
