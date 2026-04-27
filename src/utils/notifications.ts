// =============================================================
// src/utils/notifications.ts
// =============================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Konfiguracja zachowania powiadomień, gdy apka jest otwarta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Prosi o uprawnienia do powiadomień.
 */
export async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    console.log('Powiadomienia wymagają fizycznego urządzenia (nie działają w pełni na symulatorze/web).');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Brak uprawnień do powiadomień.');
    return false;
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });
  }

  return true;
}

/**
 * Planuje powiadomienie dla subskrypcji.
 * 
 * @param id Unikalne ID subskrypcji (użyte jako identyfikator powiadomienia)
 * @param name Nazwa subskrypcji
 * @param amount Kwota
 * @param currency Waluta
 * @param nextPaymentDate Data płatności (string ISO)
 * @param daysBefore Ile dni przed przypomnieć
 */
export async function scheduleSubscriptionReminder(
  id: string,
  name: string,
  amount: number,
  currency: string,
  nextPaymentDate: string,
  daysBefore: number = 1
) {
  // Najpierw usuwamy stare powiadomienie dla tego ID (jeśli istnieje)
  await cancelSubscriptionReminder(id);

  const paymentDate = new Date(nextPaymentDate);
  const triggerDate = new Date(paymentDate);
  
  // Ustawiamy godzinę przypomnienia np. na 10:00 rano
  triggerDate.setDate(paymentDate.getDate() - daysBefore);
  triggerDate.setHours(10, 0, 0, 0);

  const now = new Date();
  if (triggerDate <= now) {
    // Jeśli data przypomnienia już minęła, planujemy na "zaraz" (za 5 sekund) dla testu
    // lub po prostu nie planujemy wcale w produkcji. Tu: tylko jeśli data płatności jest w przyszłości.
    if (paymentDate > now) {
      triggerDate.setTime(now.getTime() + 1000 * 60 * 5); // 5 minut od teraz
    } else {
      return null;
    }
  }

  if (Platform.OS === 'web') return null;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Nadchodząca płatność! 💸',
      body: `Pamiętaj o subskrypcji ${name}: ${amount.toFixed(2)} ${currency} już za ${daysBefore} dni.`,
      data: { subscriptionId: id },
      sound: true,
    },
    trigger: triggerDate,
    identifier: id, // Używamy ID subskrypcji jako identyfikatora
  });

  return notificationId;
}

/**
 * Anuluje powiadomienie dla danej subskrypcji.
 */
export async function cancelSubscriptionReminder(id: string) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Anuluje wszystkie powiadomienia.
 */
export async function cancelAllReminders() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Planuje pojedyncze przypomnienie na podstawie obiektu ReminderItem.
 */
export async function scheduleReminderItem(item: any) {
  if (Platform.OS === 'web') return null;
  const triggerDate = new Date(item.remindAt);
  const now = new Date();

  if (triggerDate <= now) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Nadchodząca płatność! 💸',
      body: `Pamiętaj o subskrypcji ${item.name}. Płatność: ${new Date(item.nextPaymentDate).toLocaleDateString('pl-PL')}`,
      data: { subscriptionId: item.id },
      sound: true,
    },
    trigger: triggerDate,
    identifier: item.id,
  });
}

/**
 * Czyści wszystkie zaplanowane powiadomienia i planuje je na nowo na podstawie listy z backendu.
 */
export async function syncReminders(reminders: any[]) {
  if (Platform.OS === 'web') return;
  // Czyścimy wszystko przed synchronizacją, żeby nie dublować
  await cancelAllReminders(); 
  
  for (const reminder of reminders) {
    await scheduleReminderItem(reminder);
  }
}
