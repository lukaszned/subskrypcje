// =============================================================
// src/lib/supabase.ts
//
// Inicjalizacja klienta Supabase.
// Używany WYŁĄCZNIE do Auth (signIn, signUp, signOut, session).
// Dane aplikacji trzymamy w własnej bazie przez backend.
// =============================================================

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] Brak zmiennych środowiskowych EXPO_PUBLIC_SUPABASE_URL lub EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
    'Skopiuj .env.example do .env i uzupełnij wartościami.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persystencja sesji przez AsyncStorage (działa na iOS, Android i web)
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Wyłączone — nie używamy OAuth redirect URL w apce
  },
});
