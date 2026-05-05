// =============================================================
// App.tsx — główny entry point aplikacji
// =============================================================

import 'react-native-gesture-handler'; 
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import type { AppStackParamList, AuthStackParamList } from './src/types/navigation';

// Ekrany — Auth Stack
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Ekrany — App Stack
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SubscriptionListScreen } from './src/screens/SubscriptionListScreen';
import { ManualAddScreen } from './src/screens/ManualAddScreen';
import { SubscriptionDetailScreen } from './src/screens/SubscriptionDetailScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { EmailScanScreen } from './src/screens/EmailScanScreen';

// ─────────────────────────────────────────────────────────────
// Typy nawigacji
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Klient React Query
// ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// ─────────────────────────────────────────────────────────────
// Nawigatory
// ─────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const authScreenOptions = { headerShown: false, animation: 'fade' } as const;
const appScreenOptions = { headerShown: false, animation: 'slide_from_right' } as const;

const AuthNavigator = React.memo(function AuthNavigator() {
  return (
    <AuthStack.Navigator id="AuthStack" screenOptions={authScreenOptions}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
});

const AppNavigator = React.memo(function AppNavigator() {
  return (
    <AppStack.Navigator id="AppStack" screenOptions={appScreenOptions}>
      <AppStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ gestureEnabled: false }}
      />
      <AppStack.Screen name="SubscriptionList" component={SubscriptionListScreen} />
      <AppStack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} />
      <AppStack.Screen
        name="AddSubscription"
        component={ManualAddScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} />
      <AppStack.Screen name="Settings" component={SettingsScreen} />
      <AppStack.Screen name="EmailScan" component={EmailScanScreen} />
    </AppStack.Navigator>
  );
});

function RootNavigator() {
  const { session, isLoading } = useAuth();

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
    // Bezpieczne ładowanie uprawnień - nie blokujemy startu apki przy błędach Expo Go
    requestNotificationPermissions().catch(err => {
      console.warn('[App] Notification permissions error:', err);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <RootNavigator />
          </QueryClientProvider>
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
