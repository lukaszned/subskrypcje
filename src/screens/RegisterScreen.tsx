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

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) return;
    if (password.length < 6) {
      Alert.alert('Blad', 'Haslo musi miec co najmniej 6 znakow.');
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
      Alert.alert('Blad rejestracji', error.message || 'Sprobuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={vibrantTheme.gradients.app} style={styles.safe}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Text style={styles.title}>Utworz konto</Text>
          <Text style={styles.subtitle}>Witaj w Sub-Sentry</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={vibrantTheme.colors.textSubtle}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Haslo (min. 6 znakow)"
            placeholderTextColor={vibrantTheme.colors.textSubtle}
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
            <LinearGradient colors={vibrantTheme.gradients.primary} style={styles.buttonGradient}>
              {isLoading
                ? <ActivityIndicator color={vibrantTheme.colors.darkText} />
                : <Text style={styles.buttonText}>Zarejestruj sie</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.link}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>Masz juz konto? Zaloguj sie</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  glowOne: { position: 'absolute', width: 280, height: 280, borderRadius: 180, backgroundColor: 'rgba(32,246,181,0.18)', top: -90, right: -100 },
  glowTwo: { position: 'absolute', width: 240, height: 240, borderRadius: 160, backgroundColor: 'rgba(139,92,246,0.2)', bottom: 120, left: -100 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 40, fontWeight: '900', color: vibrantTheme.colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: vibrantTheme.colors.textMuted, marginBottom: 40 },
  input: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: vibrantTheme.colors.text,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    marginBottom: 16,
  },
  button: {
    borderRadius: 30,
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
