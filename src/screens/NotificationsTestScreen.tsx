import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BellRing, ShieldCheck, Trash2, Clock, ArrowLeft } from 'lucide-react-native';
import { NotificationManager } from '../utils/NotificationManager';

export const NotificationsTestScreen = () => {
  const navigation = useNavigation();
  const [scheduledCount, setScheduledCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [message, ...prev].slice(0, 5)); // trzymaj max 5 ostatnich logów
  };

  const refreshCount = async () => {
    const scheduled = await NotificationManager.listScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  useEffect(() => {
    refreshCount();
  }, []);

  const handleRequestPermissions = async () => {
    const granted = await NotificationManager.requestPermissions();
    if (granted) {
      Alert.alert("Sukces", "Masz uprawnienia do powiadomień!");
      addLog("🟢 Zgoda na powiadomienia przyznana.");
    } else {
      Alert.alert("Brak uprawnień", "Musisz włączyć powiadomienia w ustawieniach systemu.");
      addLog("🔴 Zgoda odrzucona.");
    }
  };

  const handleTestNotification = async () => {
    try {
      await NotificationManager.scheduleTestNotification(5);
      addLog("🔔 Zaplanowano testowe powiadomienie (5s).");
      await refreshCount();
    } catch (e) {
      addLog(`❌ Błąd: ${String(e)}`);
    }
  };

  const handleClearAll = async () => {
    await NotificationManager.cancelAllNotifications();
    addLog("🗑️ Wyczyszczono kolejkę powiadomień.");
    await refreshCount();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Powiadomień</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Narzędzia Debugowania</Text>
          <Text style={styles.cardSubtitle}>Wykorzystaj te opcje, aby sprawdzić czy system powiadomień działa poprawnie.</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.btnPermission]} 
            onPress={handleRequestPermissions}
            activeOpacity={0.8}
          >
            <ShieldCheck size={20} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.buttonText}>1. Daj uprawnienia</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.btnSchedule]} 
            onPress={handleTestNotification}
            activeOpacity={0.8}
          >
            <Clock size={20} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.buttonText}>2. Test za 5 sekund</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.btnClear]} 
            onPress={handleClearAll}
            activeOpacity={0.8}
          >
            <Trash2 size={20} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.buttonText}>3. Wyczyść wszystko</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <BellRing size={20} color="#6366F1" />
            <Text style={styles.statusTitle}>Status Systemu</Text>
          </View>
          <Text style={styles.statusText}>
            Oczekujące powiadomienia: <Text style={styles.statusCount}>{scheduledCount}</Text>
          </Text>
          
          <View style={styles.logsContainer}>
            <Text style={styles.logsTitle}>Ostatnie zdarzenia:</Text>
            {logs.length === 0 ? (
              <Text style={styles.logTextEmpty}>Brak logów</Text>
            ) : (
              logs.map((log, idx) => (
                <Text key={idx} style={styles.logText}>{log}</Text>
              ))
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  btnIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  btnPermission: {
    backgroundColor: '#EAB308', // yellow-500
  },
  btnSchedule: {
    backgroundColor: '#6366F1', // indigo-500
  },
  btnClear: {
    backgroundColor: '#EF4444', // red-500
  },
  statusCard: {
    backgroundColor: '#EEF2FF', // indigo-50
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 16,
  },
  statusCount: {
    fontWeight: '800',
    color: '#4F46E5',
  },
  logsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  logsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  logText: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 4,
  },
  logTextEmpty: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});

export default NotificationsTestScreen;
