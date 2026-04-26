// =============================================================
// App.tsx — główny entry point aplikacji
//
// ARCHITEKTURA NAWIGACJI:
//   - AuthProvider nasłuchuje sesji Supabase
//   - QueryClientProvider daje dostęp do TanStack Query
//   - Stack.Navigator renderuje różne ekrany w zależności od sesji:
//       session == null  -> Auth Stack (Onboarding, Login, Register)
//       session != null  -> App Stack (Dashboard, SubscriptionList, AddSubscription)
//
// KLUCZOWA ZASADA:
//   - Po zalogowaniu NIE wywołujemy navigation.navigate('Dashboard')
//   - Session zmienia się w AuthContext -> nawigacja przełącza się automatycznie
//   - To eliminuje race conditions i jest React-way
// =============================================================

import 'react-native-gesture-handler'; // Musi być na samej górze
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Ekrany — Auth Stack
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Ekrany — App Stack
import DashboardScreen from './src/screens/DashboardScreen';
import SubscriptionListScreen from './src/screens/SubscriptionListScreen';
import ManualAddScreen from './src/screens/ManualAddScreen';

// ─────────────────────────────────────────────────────────────
// Typy nawigacji
// ─────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Dashboard: undefined;
  SubscriptionList: undefined;
  AddSubscription: undefined;
};

// Zachowane dla kompatybilności wstecznej z istniejącymi ekranami
export type RootStackParamList = AuthStackParamList & AppStackParamList;

// ─────────────────────────────────────────────────────────────
// Klient React Query
// ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dane "świeże" przez 1 minutę — potem refetch w tle
      staleTime: 60 * 1000,
      // Retry 2 razy przy błędach (nie przy 401/403)
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // Nie retry przy mutacjach — ryzyko duplikatów
      retry: false,
    },
  },
});

// ─────────────────────────────────────────────────────────────
// Nawigatory
// ─────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <AppStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ gestureEnabled: false }}
      />
      <AppStack.Screen name="SubscriptionList" component={SubscriptionListScreen} />
      <AppStack.Screen
        name="AddSubscription"
        component={ManualAddScreen}
        options={{ presentation: 'modal' }}
      />
    </AppStack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────
// Root Navigator — reaguje na session
// ─────────────────────────────────────────────────────────────

function RootNavigator() {
  const { session, isLoading } = useAuth();

  // Spinner podczas pierwszego sprawdzania sesji (np. AsyncStorage read)
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B1120' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

// Notifications
import { requestNotificationPermissions } from './src/utils/notifications';

export default function App() {
  React.useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </AuthProvider>
  );
}
