import 'react-native-gesture-handler'; // Musi być na samej górze
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import ekranów
import DashboardScreen from './src/screens/DashboardScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SubscriptionListScreen from './src/screens/SubscriptionListScreen';
import ManualAddScreen from './src/screens/ManualAddScreen';

// Typy parametrów nawigacji
export type RootStackParamList = {
  Onboarding: undefined;
  Dashboard: undefined;
  SubscriptionList: undefined;
  AddSubscription: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerShown: false, // Ukrywamy domyślny nagłówek dla czystszego UI
          animation: 'slide_from_right' // Nowoczesna animacja przejścia
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            // Wyłączamy gest cofania na iOS dla ekranu głównego
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="SubscriptionList"
          component={SubscriptionListScreen}
        />
        <Stack.Screen
          name="AddSubscription"
          component={ManualAddScreen}
          options={{
            presentation: 'modal', // Płynne przejście typu modal
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
