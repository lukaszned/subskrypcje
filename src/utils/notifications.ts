// =============================================================
// src/utils/notifications.ts
// =============================================================

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { parseAppDate } from './date';

type ExpoNotifications = typeof import('expo-notifications');

type ReminderItem = {
  id: string;
  name: string;
  remindAt: string;
  nextPaymentDate: string;
};

let notificationsPromise: Promise<ExpoNotifications | null> | null = null;
let notificationHandlerConfigured = false;
let unsupportedExpoGoLogged = false;

function isAndroidExpoGo() {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}

function canUseNotifications() {
  return Platform.OS !== 'web' && !isAndroidExpoGo();
}

function logUnsupportedExpoGoOnce() {
  if (!__DEV__ || !isAndroidExpoGo() || unsupportedExpoGoLogged) return;

  unsupportedExpoGoLogged = true;
  console.info(
    '[Notifications] Android Expo Go does not support push notifications in recent Expo SDKs. ' +
    'Notification scheduling is skipped in Expo Go; use a development build to test it.'
  );
}

async function getNotifications(): Promise<ExpoNotifications | null> {
  if (!canUseNotifications()) {
    logUnsupportedExpoGoOnce();
    return null;
  }

  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications')
      .then((Notifications) => {
        if (!notificationHandlerConfigured) {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            }),
          });
          notificationHandlerConfigured = true;
        }

        return Notifications;
      })
      .catch((error) => {
        console.warn('[Notifications] Failed to load expo-notifications:', error);
        return null;
      });
  }

  return notificationsPromise;
}

export async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    console.log('Notifications require a physical device for full support.');
    return false;
  }

  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions were not granted.');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

export async function scheduleSubscriptionReminder(
  id: string,
  name: string,
  amount: number,
  currency: string,
  nextPaymentDate: string,
  daysBefore: number = 1
) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const paymentDate = parseAppDate(nextPaymentDate);
  if (!paymentDate) return null;

  const triggerDate = new Date(paymentDate);
  triggerDate.setDate(paymentDate.getDate() - daysBefore);
  triggerDate.setHours(10, 0, 0, 0);

  const now = new Date();
  if (triggerDate <= now) {
    if (paymentDate > now) {
      triggerDate.setTime(now.getTime() + 1000 * 60 * 5);
    } else {
      return null;
    }
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(id);

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nadchodzaca platnosc',
        body: `Pamietaj o subskrypcji ${name}: ${amount.toFixed(2)} ${currency} za ${daysBefore} dni.`,
        data: { subscriptionId: id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
      identifier: id,
    });
  } catch (error) {
    console.warn('[Notifications] Failed to schedule subscription reminder:', error);
    return null;
  }
}

export async function cancelSubscriptionReminder(id: string) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.warn('[Notifications] Failed to cancel subscription reminder:', error);
  }
}

export async function cancelAllReminders() {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('[Notifications] Failed to cancel all reminders:', error);
  }
}

export async function scheduleReminderItem(item: ReminderItem) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const triggerDate = new Date(item.remindAt);
  const now = new Date();

  if (triggerDate <= now) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nadchodzaca platnosc',
        body: `Pamietaj o subskrypcji ${item.name}. Platnosc: ${new Date(item.nextPaymentDate).toLocaleDateString('pl-PL')}`,
        data: { subscriptionId: item.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
      identifier: item.id,
    });
  } catch (error) {
    console.warn('[Notifications] Failed to schedule reminder item:', error);
    return null;
  }
}

export async function syncReminders(reminders: ReminderItem[]) {
  if (!Array.isArray(reminders) || reminders.length === 0) return;

  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const reminder of reminders) {
      await scheduleReminderItem(reminder);
    }
  } catch (error) {
    console.error('[Notifications] Failed to sync reminders:', error);
  }
}
