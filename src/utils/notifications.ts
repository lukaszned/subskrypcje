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
  reminderDaysBefore?: number;
};

const SUBSCRIPTION_REMINDER_PREFIX = 'sub-sentry.subscription-reminder.';
const SUBSCRIPTION_REMINDER_SOURCE = 'sub-sentry-subscription-reminder';
const DEFAULT_REMINDER_DAYS_BEFORE = 2;

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

function getReminderNotificationId(id: string) {
  return `${SUBSCRIPTION_REMINDER_PREFIX}${id}`;
}

function getSafeReminderDays(value: unknown) {
  const days = Number(value);
  return Number.isFinite(days) && days >= 0 ? Math.min(Math.round(days), 30) : DEFAULT_REMINDER_DAYS_BEFORE;
}

function buildReminderTriggerDate(nextPaymentDate: string, daysBefore: number) {
  const paymentDate = parseAppDate(nextPaymentDate);
  if (!paymentDate) return null;

  const triggerDate = new Date(paymentDate);
  triggerDate.setDate(paymentDate.getDate() - getSafeReminderDays(daysBefore));
  triggerDate.setHours(10, 0, 0, 0);

  const now = new Date();
  if (triggerDate <= now) {
    if (paymentDate > now) {
      triggerDate.setTime(now.getTime() + 1000 * 60 * 5);
    } else {
      return null;
    }
  }

  return triggerDate;
}

async function hasNotificationPermission(Notifications: ExpoNotifications) {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function getNotificationPermissionStatus() {
  const Notifications = await getNotifications();
  if (!Notifications) return 'unavailable';

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'unavailable';
  }
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
    await Notifications.setNotificationChannelAsync('subscription-reminders', {
      name: 'Przypomnienia o subskrypcjach',
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
  daysBefore: number = DEFAULT_REMINDER_DAYS_BEFORE
) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  if (!(await hasNotificationPermission(Notifications))) return null;

  const safeDaysBefore = getSafeReminderDays(daysBefore);
  const triggerDate = buildReminderTriggerDate(nextPaymentDate, safeDaysBefore);
  if (!triggerDate) return null;
  const notificationId = getReminderNotificationId(id);

  try {
    await Promise.allSettled([
      Notifications.cancelScheduledNotificationAsync(notificationId),
      Notifications.cancelScheduledNotificationAsync(id),
    ]);

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nadchodząca płatność',
        body: `Pamiętaj o subskrypcji ${name}: ${amount.toFixed(2)} ${currency}.`,
        data: { subscriptionId: id, source: SUBSCRIPTION_REMINDER_SOURCE },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
      identifier: notificationId,
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
    await Promise.allSettled([
      Notifications.cancelScheduledNotificationAsync(getReminderNotificationId(id)),
      Notifications.cancelScheduledNotificationAsync(id),
    ]);
  } catch (error) {
    console.warn('[Notifications] Failed to cancel subscription reminder:', error);
  }
}

export async function cancelSubscriptionReminders() {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.allSettled(
      scheduled
        .filter((notification) =>
          notification.identifier.startsWith(SUBSCRIPTION_REMINDER_PREFIX) ||
          notification.content?.data?.source === SUBSCRIPTION_REMINDER_SOURCE
        )
        .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
    );
  } catch (error) {
    console.warn('[Notifications] Failed to cancel all reminders:', error);
  }
}

export const cancelAllReminders = cancelSubscriptionReminders;

export async function scheduleReminderItem(item: ReminderItem) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  if (!(await hasNotificationPermission(Notifications))) return null;

  const remindAt = new Date(item.remindAt);
  const now = new Date();
  const triggerDate = !Number.isNaN(remindAt.getTime()) && remindAt > now
    ? remindAt
    : buildReminderTriggerDate(item.nextPaymentDate, getSafeReminderDays(item.reminderDaysBefore));
  if (!triggerDate || triggerDate <= now) return null;

  try {
    await Notifications.cancelScheduledNotificationAsync(getReminderNotificationId(item.id));

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nadchodząca płatność',
        body: `Pamiętaj o subskrypcji ${item.name}. Płatność: ${parseAppDate(item.nextPaymentDate)?.toLocaleDateString('pl-PL') || item.nextPaymentDate}`,
        data: { subscriptionId: item.id, source: SUBSCRIPTION_REMINDER_SOURCE },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
      identifier: getReminderNotificationId(item.id),
    });
  } catch (error) {
    console.warn('[Notifications] Failed to schedule reminder item:', error);
    return null;
  }
}

export async function syncReminders(reminders: ReminderItem[]) {
  if (!Array.isArray(reminders)) return;

  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    await cancelSubscriptionReminders();
    if (reminders.length === 0) return;

    for (const reminder of reminders) {
      await scheduleReminderItem(reminder);
    }
  } catch (error) {
    console.error('[Notifications] Failed to sync reminders:', error);
  }
}
