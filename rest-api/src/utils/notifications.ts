import mongoose from 'mongoose';
import schedule from 'node-schedule';
import { Expo } from 'expo-server-sdk';
import { Mechanic } from '../models/Mechanic';

// Expo SDK client oluştur
const expo = new Expo();

export const sendNotification = async (
  userId: mongoose.Types.ObjectId,
  title: string,
  message: string,
  scheduledTime?: Date
) => {
  try {
    if (scheduledTime) {
      // Zamanlanmış bildirim
      schedule.scheduleJob(scheduledTime, () => {
        console.log(`Zamanlanmış bildirim gönderildi - Kullanıcı: ${userId}, Başlık: ${title}, Mesaj: ${message}`);
        // TODO: Push notification sistemi entegrasyonu
        // TODO: Email bildirimi entegrasyonu
        // TODO: SMS bildirimi entegrasyonu
      });
    } else {
      // Anlık bildirim
      console.log(`Anlık bildirim gönderildi - Kullanıcı: ${userId}, Başlık: ${title}, Mesaj: ${message}`);
      // TODO: Push notification sistemi entegrasyonu
      // TODO: Email bildirimi entegrasyonu
      // TODO: SMS bildirimi entegrasyonu
    }
    
    return true;
  } catch (error) {
    console.error('Bildirim gönderilirken hata oluştu:', error);
    return false;
  }
};

export const sendPushNotification = async (
  mechanicId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) => {
  try {
    const mechanic = await Mechanic.findById(mechanicId);
    if (!mechanic || !mechanic.pushToken) {
      console.log(`Usta bulunamadı veya push token'ı yok: ${mechanicId}`);
      return;
    }

    const pushToken = mechanic.pushToken;

    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} geçerli bir Expo Push Token değil`);
      return;
    }

    const message = {
      to: pushToken,
      sound: 'default' as const,
      title,
      body,
      data: data || {},
    };

    await expo.sendPushNotificationsAsync([message]);
    console.log(`Bildirim başarıyla gönderildi: ${mechanicId}`);

  } catch (error) {
    console.error('Push bildirimi gönderilirken hata oluştu:', error);
  }
}; 