import 'react-native-gesture-handler';

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';

import { getCachedDashboardSummary } from './src/api/dashboard';
import { getCachedSubscriptions } from './src/api/subscriptions';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DASHBOARD_SUMMARY_KEY } from './src/hooks/useDashboardSummary';
import { SUBSCRIPTIONS_KEY } from './src/hooks/useSubscriptions';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { EmailScanScreen } from './src/screens/EmailScanScreen';
import { GuardScreen } from './src/screens/GuardScreen';
import { HealthScoreDetailsScreen } from './src/screens/HealthScoreDetailsScreen';
import LoginScreen from './src/screens/LoginScreen';
import { ManualAddScreen } from './src/screens/ManualAddScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { PaymentCalendarScreen } from './src/screens/PaymentCalendarScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { SavingsDetailsScreen } from './src/screens/SavingsDetailsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen';
import { SubscriptionDetailScreen } from './src/screens/SubscriptionDetailScreen';
import { SubscriptionListScreen } from './src/screens/SubscriptionListScreen';
import { SubscriptionReviewQueueScreen } from './src/screens/SubscriptionReviewQueueScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import type { AppStackParamList, AuthStackParamList } from './src/types/navigation';
import { requestNotificationPermissions } from './src/utils/notifications';

enableScreens(true);
enableFreeze(true);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error: any) => {
        if (error?.status === 0 || error?.status === 401 || error?.status === 403) {
          return false;
        }

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

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const authScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'fade',
  freezeOnBlur: true,
};

const appScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'default',
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  freezeOnBlur: true,
};

const AuthNavigator = React.memo(function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={authScreenOptions}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
});

const AppNavigator = React.memo(function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={appScreenOptions}>
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
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
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
      <View style={[styles.loadingRoot, { backgroundColor: theme.colors.bg }]}>
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
    if (!session) return undefined;

    let isMounted = true;

    Promise.all([
      getCachedDashboardSummary(),
      getCachedSubscriptions(),
    ])
      .then(([summary, subscriptions]) => {
        if (!isMounted) return;

        if (summary) {
          queryClient.setQueryData(DASHBOARD_SUMMARY_KEY, summary);
        }

        if (subscriptions) {
          queryClient.setQueryData(SUBSCRIPTIONS_KEY(), subscriptions);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [queryClient, session]);

  return null;
}

export default function App() {
  React.useEffect(() => {
    requestNotificationPermissions().catch((error) => {
      console.warn('[App] Notification permissions error:', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
