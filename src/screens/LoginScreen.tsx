// =============================================================
// src/screens/LoginScreen.tsx
// =============================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock, Mail } from 'lucide-react-native';
import type { AuthStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { signIn } = useAuth();
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>Sub-Sentry</Text>
          <Text style={styles.title}>Zaloguj się</Text>
          <Text style={styles.subtitle}>Kontroluj subskrypcje spokojnie, bez chaosu w płatnościach.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputShell}>
            <Mail size={20} color="#0B6B3A" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8B9A91"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputShell}>
            <Lock size={20} color="#0B6B3A" />
            <TextInput
              style={styles.input}
              placeholder="Hasło"
              placeholderTextColor="#8B9A91"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!email || !password || isLoading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!email || !password || isLoading}
            activeOpacity={0.8}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Zaloguj</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.link}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>Nie masz konta? Zarejestruj się</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8F4' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  hero: { marginBottom: 28 },
  brand: { fontSize: 13, fontWeight: '900', color: '#0B6B3A', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 34, fontWeight: '900', color: '#14251B', marginTop: 10 },
  subtitle: { fontSize: 15, color: '#66756A', marginTop: 10, lineHeight: 22 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    shadowColor: '#1C3025',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#F6F8F4',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6ECE4',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: '#14251B',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#0B6B3A',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
    shadowColor: '#0B6B3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  link: { alignItems: 'center', paddingVertical: 10 },
  linkText: { color: '#0B6B3A', fontSize: 14, fontWeight: '800' },
});
