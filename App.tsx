import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  type DrawerContentComponentProps,
  type DrawerNavigationOptions,
} from '@react-navigation/drawer';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Home,
  Inbox,
  ListChecks,
  LogOut,
  Settings,
} from 'lucide-react-native';

import { getCachedDashboardSummary } from './src/api/dashboard';
import { getCachedSubscriptions } from './src/api/subscriptions';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DASHBOARD_SUMMARY_KEY } from './src/hooks/useDashboardSummary';
import { SUBSCRIPTIONS_KEY } from './src/hooks/useSubscriptions';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { EmailScanScreen } from './src/screens/EmailScanScreen';
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
const AppDrawer = createDrawerNavigator<AppStackParamList>();

const authScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'fade',
  freezeOnBlur: true,
};

const appScreenOptions: DrawerNavigationOptions = {
  headerShown: false,
  drawerType: 'front',
  swipeEdgeWidth: 60,
  drawerStyle: {
    width: 302,
    backgroundColor: '#070A12',
  },
  sceneStyle: {
    backgroundColor: '#070A12',
  },
  overlayColor: 'rgba(0,0,0,0.42)',
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

type DrawerItemConfig = {
  route: keyof AppStackParamList;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

const drawerItems: DrawerItemConfig[] = [
  { route: 'Dashboard', label: 'Dashboard', description: 'Finansowy pulpit', icon: Home },
  { route: 'SubscriptionList', label: 'Subskrypcje', description: 'Lista i statusy', icon: ListChecks },
  { route: 'PaymentCalendar', label: 'Kalendarz płatności', description: 'Terminy i cashflow', icon: CalendarDays },
  { route: 'Statistics', label: 'Statystyki', description: 'Koszty i trendy', icon: BarChart3 },
  { route: 'SubscriptionReviewQueue', label: 'Kolejka decyzji', description: 'Co wymaga uwagi', icon: ClipboardCheck },
  { route: 'EmailScan', label: 'Skaner Gmail', description: 'Wykrywanie subskrypcji', icon: Inbox },
  { route: 'Settings', label: 'Ustawienia', description: 'Motyw, waluty, konto', icon: Settings },
];

function AppDrawerContent(props: DrawerContentComponentProps) {
  const { signOut } = useAuth();
  const { theme } = useTheme();
  const activeRoute = props.state.routeNames[props.state.index];

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[styles.drawerContent, { backgroundColor: theme.colors.bg }]}
    >
      <View style={[styles.drawerBrand, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.drawerLogo, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.drawerLogoText, { color: theme.colors.darkText }]}>SS</Text>
        </View>
        <View>
          <Text style={[styles.drawerTitle, { color: theme.colors.text }]}>Sub-Sentry</Text>
          <Text style={[styles.drawerSubtitle, { color: theme.colors.textMuted }]}>Centrum kontroli kosztów</Text>
        </View>
      </View>

      <View style={styles.drawerItems}>
        {drawerItems.map((item) => {
          const Icon = item.icon;
          const focused = activeRoute === item.route;

          return (
            <TouchableOpacity
              key={item.route}
              activeOpacity={0.82}
              style={[
                styles.drawerItem,
                { borderColor: focused ? theme.colors.primary : theme.colors.border },
                focused && { backgroundColor: `${theme.colors.primary}18` },
              ]}
              onPress={() => props.navigation.navigate(item.route as never)}
            >
              <View style={[styles.drawerItemIcon, { backgroundColor: focused ? `${theme.colors.primary}24` : theme.colors.cardSoft }]}>
                <Icon size={18} color={focused ? theme.colors.primary : theme.colors.textMuted} />
              </View>
              <View style={styles.drawerItemText}>
                <Text style={[styles.drawerItemLabel, { color: focused ? theme.colors.primary : theme.colors.text }]}>
                  {item.label}
                </Text>
                <Text style={[styles.drawerItemDescription, { color: theme.colors.textSubtle }]} numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        activeOpacity={0.82}
        style={[styles.drawerLogout, { borderColor: theme.colors.border }]}
        onPress={signOut}
      >
        <LogOut size={18} color={theme.colors.danger} />
        <Text style={[styles.drawerLogoutText, { color: theme.colors.danger }]}>Wyloguj</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const hiddenDrawerOptions: DrawerNavigationOptions = {
  drawerItemStyle: { display: 'none' },
  swipeEnabled: false,
};

const AppNavigator = React.memo(function AppNavigator() {
  return (
    <AppDrawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={appScreenOptions}
      drawerContent={(props) => <AppDrawerContent {...props} />}
    >
      <AppDrawer.Screen
        name="Dashboard"
        component={DashboardScreen}
      />
      <AppDrawer.Screen name="SubscriptionList" component={SubscriptionListScreen} />
      <AppDrawer.Screen name="PaymentCalendar" component={PaymentCalendarScreen} />
      <AppDrawer.Screen name="Statistics" component={StatisticsScreen} />
      <AppDrawer.Screen name="SubscriptionReviewQueue" component={SubscriptionReviewQueueScreen} />
      <AppDrawer.Screen name="EmailScan" component={EmailScanScreen} />
      <AppDrawer.Screen name="Settings" component={SettingsScreen} />
      <AppDrawer.Screen
        name="SubscriptionDetail"
        component={SubscriptionDetailScreen}
        options={hiddenDrawerOptions}
      />
      <AppDrawer.Screen
        name="AddSubscription"
        component={ManualAddScreen}
        options={hiddenDrawerOptions}
      />
      <AppDrawer.Screen name="Notifications" component={NotificationsScreen} options={hiddenDrawerOptions} />
      <AppDrawer.Screen name="HealthScoreDetails" component={HealthScoreDetailsScreen} options={hiddenDrawerOptions} />
      <AppDrawer.Screen name="SavingsDetails" component={SavingsDetailsScreen} options={hiddenDrawerOptions} />
    </AppDrawer.Navigator>
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
  drawerContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  drawerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 18,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  drawerLogo: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerLogoText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  drawerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  drawerItems: {
    gap: 8,
  },
  drawerItem: {
    minHeight: 58,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemText: {
    flex: 1,
  },
  drawerItemLabel: {
    fontSize: 14,
    fontWeight: '900',
  },
  drawerItemDescription: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  drawerLogout: {
    marginTop: 'auto',
    borderTopWidth: 1,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerLogoutText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
