interface LocalNotificationPlugin {
  checkPermissions?: () => Promise<{ display?: string }>;
  requestPermissions?: () => Promise<{ display?: string }>;
  createChannel?: (options: { id: string; name: string; description?: string; importance?: number }) => Promise<void>;
  cancel?: (options: { notifications: { id: number }[] }) => Promise<void>;
  schedule?: (options: {
    notifications: {
      id: number;
      title: string;
      body: string;
      schedule: { at: Date; repeats?: boolean };
      channelId?: string;
      smallIcon?: string;
      iconColor?: string;
      extra?: Record<string, unknown>;
    }[];
  }) => Promise<unknown>;
}

interface CapacitorWindow extends Window {
  Capacitor?: {
    Plugins?: {
      LocalNotifications?: LocalNotificationPlugin;
    };
  };
}

const reminderNotificationId = 2601;
const reminderChannelId = 'reset-loop-reminders';

const notificationMessages = [
  {
    title: 'Just do one thing',
    body: 'A tiny reset is enough for today.',
  },
  {
    title: 'Keep your streak alive',
    body: 'One small action keeps the loop going.',
  },
];

function getNativeLocalNotifications() {
  if (typeof window === 'undefined') return null;
  return (window as CapacitorWindow).Capacitor?.Plugins?.LocalNotifications ?? null;
}

function nextReminderDate(reminderTime: string) {
  const [hour, minute] = reminderTime.split(':').map(Number);
  const nextAlert = new Date();
  nextAlert.setHours(hour, minute, 0, 0);
  if (nextAlert <= new Date()) nextAlert.setDate(nextAlert.getDate() + 1);
  return nextAlert;
}

export function hasNativeLocalNotifications() {
  return Boolean(getNativeLocalNotifications());
}

export async function requestReminderPermission() {
  const localNotifications = getNativeLocalNotifications();
  if (localNotifications) {
    const currentPermission = await localNotifications.checkPermissions?.();
    if (currentPermission?.display === 'granted') return 'native-granted';

    const requestedPermission = await localNotifications.requestPermissions?.();
    return requestedPermission?.display === 'granted' ? 'native-granted' : 'native-blocked';
  }

  if (!('Notification' in window)) return 'unsupported';
  const permission = await Notification.requestPermission();
  return permission === 'granted' ? 'browser-granted' : 'browser-blocked';
}

export async function scheduleDailyReminder(reminderTime: string, userId: string) {
  const localNotifications = getNativeLocalNotifications();
  if (!localNotifications?.schedule) return 'browser';

  await localNotifications.createChannel?.({
    id: reminderChannelId,
    name: 'Reset reminders',
    description: 'Gentle Reset Loop reminders',
    importance: 4,
  });

  await localNotifications.cancel?.({
    notifications: [{ id: reminderNotificationId }],
  });

  const nextMessage = notificationMessages[Math.floor(Math.random() * notificationMessages.length)];
  await localNotifications.schedule({
    notifications: [
      {
        id: reminderNotificationId,
        title: nextMessage.title,
        body: nextMessage.body,
        schedule: {
          at: nextReminderDate(reminderTime),
          repeats: true,
        },
        channelId: reminderChannelId,
        smallIcon: 'ic_stat_reset_loop',
        iconColor: '#5b8dff',
        extra: { userId },
      },
    ],
  });

  return 'native';
}
