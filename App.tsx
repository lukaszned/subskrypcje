// =============================================================
// App.tsx — główny entry point aplikacji
// =============================================================

import 'react-native-gesture-handler'; 
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import type { AppStackParamList, AuthStackParamList } from './src/types/navigation';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { getCachedDashboardSummary } from './src/api/dashboard';
import { getCachedSubscriptions } from './src/api/subscriptions';
import { DASHBOARD_SUMMARY_KEY } from './src/hooks/useDashboardSummary';
import { SUBSCRIPTIONS_KEY } from './src/hooks/useSubscriptions';

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
import { StatisticsScreen } from './src/screens/StatisticsScreen';
import { PaymentCalendarScreen } from './src/screens/PaymentCalendarScreen';
import { GuardScreen } from './src/screens/GuardScreen';
import { SubscriptionReviewQueueScreen } from './src/screens/SubscriptionReviewQueueScreen';
import { HealthScoreDetailsScreen } from './src/screens/HealthScoreDetailsScreen';
import { SavingsDetailsScreen } from './src/screens/SavingsDetailsScreen';

// ─────────────────────────────────────────────────────────────
// Typy nawigacji
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Klient React Query
// ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error: any) => {
        if (error?.status === 0) return false;
        if (error?.status === 401 || error?.status === 403) return false;
        const message = error?.message || '';
        const isConnectivityIssue = /timeout|network request failed|failed to fetch|offline|load failed/i.test(message);

        if (isConnectivityIssue) return false;
        if (error?.status >= 500) return failureCount < 1;
        return failureCount < 1;
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
      <AppStack.Screen name="Statistics" component={StatisticsScreen} />
      <AppStack.Screen name="PaymentCalendar" component={PaymentCalendarScreen} />
      <AppStack.Screen name="Guard" component={GuardScreen} />
      <AppStack.Screen name="SubscriptionReviewQueue" component={SubscriptionReviewQueueScreen} />
      <AppStack.Screen name="HealthScoreDetails" component={HealthScoreDetailsScreen} />
      <AppStack.Screen name="SavingsDetails" component={SavingsDetailsScreen} />
    </AppStack.Navigator>
  );
});

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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

function AppCacheWarmup() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!session) return;

    let isMounted = true;

    Promise.all([
      getCachedDashboardSummary(),
      getCachedSubscriptions(),
    ]).then(([summary, subscriptions]) => {
      if (!isMounted) return;

      if (summary) {
        queryClient.setQueryData(DASHBOARD_SUMMARY_KEY, summary);
      }

      if (subscriptions) {
        queryClient.setQueryData(SUBSCRIPTIONS_KEY(), subscriptions);
      }
    }).catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [queryClient, session]);

  return null;
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
      <ThemeProvider>
        <ErrorBoundary>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <AppCacheWarmup />
              <RootNavigator />
            </QueryClientProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
