// =============================================================
// src/context/AuthContext.tsx
//
// Globalny kontekst autoryzacji.
//
// ODPOWIEDZIALNOŚCI:
//   - nasłuchuje zmian sesji Supabase (onAuthStateChange)
//   - eksponuje session, user, isLoading
//   - eksponuje metody signIn, signUp, signOut
//
// UŻYCIE:
//   - owinąć całą aplikację w <AuthProvider>
//   - w komponentach używać hooka useAuth()
//
// NAWIGACJA:
//   - App.tsx reaguje na session z tego kontekstu
//   - jeśli session == null -> ekrany auth (Onboarding/Login)
//   - jeśli session != null -> ekrany app (Dashboard/...)
// =============================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────
// Typ kontekstu
// ─────────────────────────────────────────────────────────────

interface AuthContextType {
  /** Aktualna sesja Supabase (null = niezalogowany) */
  session: Session | null;
  /** Aktualny użytkownik Supabase Auth (null = niezalogowany) */
  user: User | null;
  /** true podczas pierwszego sprawdzania sesji przy starcie apki */
  isLoading: boolean;
  /** Logowanie email + hasło */
  signIn: (email: string, password: string) => Promise<void>;
  /** Rejestracja email + hasło */
  signUp: (email: string, password: string) => Promise<void>;
  /** Wylogowanie */
  signOut: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// Inicjalizacja kontekstu
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true na start

  useEffect(() => {
    // 1. Pobierz istniejącą sesję (z AsyncStorage — persystentna)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 2. Nasłuchuj zmian sesji (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Metody auth ─────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error; // Obsługa błędu w komponencie (LoginScreen)
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error; // Obsługa błędu w komponencie (RegisterScreen)
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  // ── Wartość kontekstu ────────────────────────────────────────

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth musi być używany wewnątrz <AuthProvider>');
  }
  return context;
}
