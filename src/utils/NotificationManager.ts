import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Konfiguracja handlera powiadomień.
// Określa zachowanie, gdy powiadomienie przychodzi w momencie, 
// gdy użytkownik aktywnie korzysta z aplikacji (Foreground).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationManager {
  /**
   * Sprawdza i ewentualnie prosi o uprawnienia do wysyłania powiadomień.
   */
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Powiadomienia Push wymagają fizycznego urządzenia (iOS/Android). Symulatory mogą nie wspierać pełnej funkcjonalności.');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Użytkownik odmówił uprawnień do powiadomień.');
      return false;
    }

    // Dla Androida wymagana jest konfiguracja kanału
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    return true;
  }

  /**
   * Planuje przypomnienie o subskrypcji na 24h przed płatnością o 9:00.
   */
  static async scheduleSubscriptionReminder(subName: string, price: string, paymentDate: Date) {
    // Kopia daty, by uniknąć mutacji
    const triggerDate = new Date(paymentDate);
    
    // Ustawienie na dzień wcześniej, 9:00 rano
    triggerDate.setDate(triggerDate.getDate() - 1);
    triggerDate.setHours(9, 0, 0, 0);

    // Zapobieganie zaplanowaniu w przeszłości
    if (triggerDate.getTime() < Date.now()) {
      console.log(`Nie można zaplanować powiadomienia w przeszłości dla ${subName}`);
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Nadchodząca płatność: ${subName} 🔔`,
        body: `Jutro pobierzemy z Twojego konta ${price}. Upewnij się, że masz środki!`,
        data: { subName, screen: 'SubscriptionList' },
      },
      trigger: triggerDate as any,
    });
    
    console.log(`Powiadomienie dla ${subName} zaplanowane na: ${triggerDate.toLocaleString()}`);
  }

  /**
   * Natychmiastowy test - planuje powiadomienie za X sekund.
   */
  static async scheduleTestNotification(seconds: number = 5) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "To jest powiadomienie testowe! 🎉",
        body: "Działa! Powiadomienia lokalne są poprawnie skonfigurowane.",
        data: { test: true, screen: 'SubscriptionList' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds,
      },
    });
    console.log(`Powiadomienie testowe zaplanowane za ${seconds}s.`);
  }

  /**
   * Anuluje wszystkie zaplanowane powiadomienia.
   */
  static async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Wszystkie powiadomienia zostały wyczyszczone.');
  }

  /**
   * Zwraca i loguje do konsoli wszystkie zaplanowane powiadomienia.
   */
  static async listScheduledNotifications() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Zaplanowane powiadomienia:', scheduled);
    return scheduled;
  }

  /**
   * Ustawia nasłuchiwacze interakcji z powiadomieniem (np. kliknięcie).
   * Powinien być wywołany w głównym punkcie aplikacji (np. App.tsx lub Dashboard).
   */
  static setupNotificationListener() {
    // Nasłuchuje, gdy powiadomienie zostanie odebrane w tle / na pierwszym planie
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Otrzymano powiadomienie w trakcie używania aplikacji:', notification);
    });

    // Nasłuchuje reakcji użytkownika (np. kliknięcie w powiadomienie z paska zadań)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Użytkownik kliknął powiadomienie:', response);
      
      const screen = response.notification.request.content.data?.screen;
      if (screen === 'SubscriptionList') {
        console.log('=> Symulacja Deep Linkingu: Przejście do ekranu Listy Subskrypcji...');
        // W pełnej aplikacji tutaj użyto by np. nawigacji przez reft
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }
}
