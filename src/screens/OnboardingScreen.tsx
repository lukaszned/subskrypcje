import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../App';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const handleStart = () => {
    navigation.navigate('Login');
  };

  const handleHelp = () => {
    console.log('Pomoc kliknięta');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Główna sekcja (Środek ekranu) */}
        <View style={styles.mainContent}>
          {/* Miejsce na logo/grafikę w przyszłości */}
          <View style={styles.logoPlaceholder} />

          <Text style={styles.title}>Sub-Sentry</Text>
          <Text style={styles.tagline}>
            Twoje subskrypcje, Twoje zasady. Odzyskaj kontrolę nad wydatkami.
          </Text>
        </View>

        {/* Sekcja akcji (Dół ekranu) */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={handleStart}
          >
            <Text style={styles.primaryButtonText}>Rozpocznij</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpButton}
            activeOpacity={0.6}
            onPress={handleHelp}
          >
            <Text style={styles.helpButtonText}>
              Potrzebujesz pomocy? Skontaktuj się z nami
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1120', // Bardzo ciemny granat (nowoczesny, elegancki)
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoPlaceholder: {
    width: 150,
    height: 150,
    marginBottom: 40,
    // Subtelny zarys dla podglądu podczas dewelopmentu
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  primaryButton: {
    width: width * 0.88, // ~88% szerokości ekranu
    backgroundColor: '#6366F1', // Nowoczesny odcień indygo jako kolor akcentujący
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  helpButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  helpButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '500',
  },
});
