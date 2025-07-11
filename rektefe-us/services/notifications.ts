import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { updateMechanicProfile } from './auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // Yeni SDK versiyonları için ek ayarlar
    // priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    console.log('Push bildirimleri için fiziksel bir cihaz gereklidir.');
    return;
  }
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Push bildirimleri için izin alınamadı!');
    return;
  }
  
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      throw new Error('Expo proje ID bulunamadı. app.json dosyasını kontrol edin.');
    }
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Expo Push Token:', token);
  } catch (e) {
    console.error("Token alınırken hata oluştu: ", e);
  }

  return token;
}

export async function savePushToken(token: string) {
    if (!token) return;
    try {
        await updateMechanicProfile({ pushToken: token });
        console.log('Push token başarıyla sunucuya kaydedildi.');
    } catch (error) {
        console.error('Push token sunucuya kaydedilirken hata oluştu:', error);
    }
} 