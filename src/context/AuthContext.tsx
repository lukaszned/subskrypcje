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

let hasLoggedSessionRestoreIssue = false;

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (/network request failed|failed to fetch|internet|offline|load failed/i.test(message)) {
    return 'Nie mozna polaczyc z Supabase Auth. Sprawdz EXPO_PUBLIC_SUPABASE_URL oraz internet telefonu.';
  }

  return message || 'Nie udalo sie wykonac operacji autoryzacji.';
}

function logSessionRestoreIssue(error: unknown) {
  if (!__DEV__ || hasLoggedSessionRestoreIssue) return;

  hasLoggedSessionRestoreIssue = true;
  console.info(
    `[Auth] Session restore skipped: ${getAuthErrorMessage(error)} ` +
    `URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL || 'missing'}`
  );
}

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
    let isMounted = true;

    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };
    // 1. Pobierz istniejącą sesję (z AsyncStorage — persystentna)
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return;

        if (error) {
          logSessionRestoreIssue(error);
        }

        applySession(error ? null : session);
      })
      .catch((error) => {
        if (!isMounted) return;

        logSessionRestoreIssue(error);
        applySession(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    // 2. Nasłuchuj zmian sesji (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Metody auth ─────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(getAuthErrorMessage(error));
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(getAuthErrorMessage(error));
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(getAuthErrorMessage(error));
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
