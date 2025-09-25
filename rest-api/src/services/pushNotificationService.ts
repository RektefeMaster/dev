import axios from 'axios';

interface PushNotificationData {
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

/**
 * Expo Push Notification gönder
 */
export async function sendPushNotification(
  expoPushToken: string,
  notification: PushNotificationData
): Promise<void> {
  try {
    const message: ExpoPushMessage = {
      to: expoPushToken,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: notification.sound || 'default',
      badge: notification.badge,
      priority: 'high',
      ttl: 3600 // 1 saat
    };

    const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    } catch (error) {
    throw error;
  }
}

/**
 * Toplu push notification gönder
 */
export async function sendBulkPushNotifications(
  expoPushTokens: string[],
  notification: PushNotificationData
): Promise<void> {
  try {
    const messages: ExpoPushMessage[] = expoPushTokens.map(token => ({
      to: token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: notification.sound || 'default',
      badge: notification.badge,
      priority: 'high',
      ttl: 3600
    }));

    const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    } catch (error) {
    throw error;
  }
}

/**
 * Bildirim türüne göre özel ayarlar
 */
export function getNotificationConfig(type: string): Partial<PushNotificationData> {
  switch (type) {
    case 'appointment_request':
      return {
        sound: 'default',
        priority: 'high'
      };
    case 'payment_received':
      return {
        sound: 'default',
        priority: 'high'
      };
    case 'emergency':
      return {
        sound: 'default',
        priority: 'high'
      };
    case 'message':
      return {
        sound: 'default',
        priority: 'normal'
      };
    case 'system':
      return {
        sound: 'default',
        priority: 'normal'
      };
    default:
      return {
        sound: 'default',
        priority: 'normal'
      };
  }
}
