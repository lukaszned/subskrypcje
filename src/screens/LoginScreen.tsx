// =============================================================
// src/screens/LoginScreen.tsx
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
import { Lock, Mail } from 'lucide-react-native';
import type { AuthStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Błąd logowania', error.message || 'Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.gradients.app} style={styles.safe}>
      <View style={[styles.glowOne, { backgroundColor: `${theme.colors.primary}33` }]} />
      <View style={[styles.glowTwo, { backgroundColor: `${theme.colors.cyan}29` }]} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.hero}>
            <Text style={[styles.brand, { color: theme.colors.primary }]}>Sub-Sentry</Text>
            <Text style={styles.title}>Zaloguj sie</Text>
            <Text style={styles.subtitle}>Kontroluj subskrypcje spokojnie, bez chaosu w płatnościach.</Text>
          </View>

          <LinearGradient colors={theme.gradients.glass} style={[styles.card, { borderColor: theme.colors.border }]}>
            <View style={styles.inputShell}>
              <Mail size={20} color={theme.colors.primary} />
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
            </View>

            <View style={styles.inputShell}>
              <Lock size={20} color={theme.colors.primary} />
              <TextInput
                style={styles.input}
                placeholder="Hasło"
                placeholderTextColor={theme.colors.textSubtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, (!email || !password || isLoading) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={!email || !password || isLoading}
              activeOpacity={0.86}
            >
              <LinearGradient colors={theme.gradients.primary} style={styles.buttonGradient}>
                {isLoading
                  ? <ActivityIndicator color={theme.colors.darkText} />
                  : <Text style={styles.buttonText}>Zaloguj</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.link}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.linkText}>Nie masz konta? Zarejestruj sie</Text>
            </TouchableOpacity>
          </LinearGradient>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  glowOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 180,
    backgroundColor: 'rgba(34,211,238,0.2)',
    top: -80,
    right: -90,
  },
  glowTwo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 150,
    backgroundColor: 'rgba(236,72,153,0.16)',
    bottom: 120,
    left: -100,
  },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  hero: { marginBottom: 28 },
  brand: { fontSize: 13, fontWeight: '900', color: vibrantTheme.colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 42, fontWeight: '900', color: vibrantTheme.colors.text, marginTop: 10 },
  subtitle: { fontSize: 15, color: vibrantTheme.colors.textMuted, marginTop: 10, lineHeight: 22 },
  card: {
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    ...vibrantTheme.shadows.card,
  },
  inputShell: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: vibrantTheme.colors.text,
    fontWeight: '700',
  },
  button: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 16,
    ...vibrantTheme.shadows.glow,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: vibrantTheme.colors.darkText, fontSize: 17, fontWeight: '900' },
  link: { alignItems: 'center', paddingVertical: 10 },
  linkText: { color: vibrantTheme.colors.primary, fontSize: 14, fontWeight: '900' },
});
