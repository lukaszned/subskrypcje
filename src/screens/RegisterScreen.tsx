// =============================================================
// src/screens/RegisterScreen.tsx
// =============================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) return;
    if (password.length < 6) {
      Alert.alert('Błąd', 'Hasło musi mieć co najmniej 6 znaków.');
      return;
    }
    setIsLoading(true);
    try {
      await signUp(email.trim(), password);
      Alert.alert(
        'Konto utworzone!',
        'Sprawdz swoj email i potwierdz rejestracje, a nastepnie zaloguj sie.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Błąd rejestracji', error.message || 'Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.gradients.app} style={styles.safe}>
      <View style={[styles.glowOne, { backgroundColor: `${theme.colors.primary}2E` }]} />
      <View style={[styles.glowTwo, { backgroundColor: `${theme.colors.cyan}33` }]} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>Utwórz konto</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Witaj w Sub-Sentry</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.colors.textSubtle}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Hasło (min. 6 znaków)"
            placeholderTextColor={theme.colors.textSubtle}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, (!email || !password || isLoading) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={!email || !password || isLoading}
            activeOpacity={0.86}
          >
            <LinearGradient colors={theme.gradients.primary} style={styles.buttonGradient}>
              {isLoading
                ? <ActivityIndicator color={theme.colors.darkText} />
                : <Text style={[styles.buttonText, { color: theme.colors.darkText }]}>Zarejestruj się</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.link}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.linkText, { color: theme.colors.primary }]}>Masz już konto? Zaloguj się</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  glowOne: { position: 'absolute', width: 280, height: 280, borderRadius: 180, backgroundColor: 'rgba(255,255,255,0.18)', top: -90, right: -100 },
  glowTwo: { position: 'absolute', width: 240, height: 240, borderRadius: 160, backgroundColor: 'rgba(139,92,246,0.2)', bottom: 120, left: -100 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 40, fontWeight: '900', color: vibrantTheme.colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: vibrantTheme.colors.textMuted, marginBottom: 40 },
  input: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: vibrantTheme.colors.text,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    ...vibrantTheme.shadows.glow,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: vibrantTheme.colors.darkText, fontSize: 17, fontWeight: '900' },
  link: { alignItems: 'center', paddingVertical: 10 },
  linkText: { color: vibrantTheme.colors.textMuted, fontSize: 14 },
});
