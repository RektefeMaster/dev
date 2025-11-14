import mongoose from 'mongoose';
import schedule from 'node-schedule';
import { Expo } from 'expo-server-sdk';
import { Mechanic } from '../models/Mechanic';
import { Notification } from '../models/Notification';
import { sendNotificationToUser } from './socketNotifications';

// Expo SDK client oluştur
const expo = new Expo();

export const sendNotification = async (
  recipientId: mongoose.Types.ObjectId,
  recipientType: 'mechanic' | 'driver',
  title: string,
  message: string,
  type: 'appointment_request' | 'appointment_confirmed' | 'appointment_rejected' | 'reminder' | 'system' | 'fault_report' | 'towing_request' | 'payment_received' | 'payment_pending' | 'new_message' | 'quote_received' | 'quote_selected' | 'quote_accepted' | 'quote_rejected' | 'bodywork_quote_sent' | 'bodywork_quote_accepted' | 'bodywork_quote_rejected' | 'bodywork_stage_update' | 'bodywork_approval_request' | 'bodywork_job_completed' | 'electrical_quote_sent' | 'electrical_quote_accepted' | 'electrical_quote_rejected' | 'electrical_stage_approval' | 'electrical_stage_updated' | 'electrical_approval_requested' | 'electrical_job_completed' | 'discount_requested' | 'discount_response' | 'price_approved',
  data?: Record<string, any>,
  scheduledTime?: Date
) => {
  try {
    // Bildirimi veritabanına kaydet
    const notification = new Notification({
      recipientId,
      recipientType,
      title,
      message,
      type,
      data
    });

    await notification.save();

    if (scheduledTime) {
      // Zamanlanmış bildirim
      schedule.scheduleJob(scheduledTime, async () => {
        await sendRealTimeNotification(recipientId, notification);
        await sendPushNotification(recipientId.toString(), title, message, data);
      });
    } else {
      // Anlık bildirim
      await sendRealTimeNotification(recipientId, notification);
      await sendPushNotification(recipientId.toString(), title, message, data);
    }
    
    return notification;
  } catch (error) {
    return null;
  }
};

// Real-time bildirim gönderme (Socket.io)
const sendRealTimeNotification = async (userId: mongoose.Types.ObjectId, notification: any) => {
  try {
    sendNotificationToUser(userId.toString(), {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      appointmentId: notification.appointmentId,
      userId: notification.userId,
      data: notification.data
    });

  } catch (error) {
    }
};

// Randevu talebi bildirimi
export const sendAppointmentRequestNotification = async (
  mechanicId: mongoose.Types.ObjectId,
  appointmentId: mongoose.Types.ObjectId,
  driverName: string,
  serviceType: string,
  appointmentDate: Date,
  timeSlot: string
) => {
  const title = '🆕 Yeni Randevu Talebi';
  const message = `${driverName} adlı müşteri ${serviceType} hizmeti için ${appointmentDate.toLocaleDateString('tr-TR')} tarihinde ${timeSlot} saatinde randevu talebinde bulundu.`;
  
  return await sendNotification(
    mechanicId,
    'mechanic',
    title,
    message,
    'appointment_request',
    {
      appointmentId,
      driverName,
      serviceType,
      appointmentDate,
      timeSlot,
      priority: 'high'
    }
  );
};

// Randevu onay/red bildirimi
export const sendAppointmentStatusNotification = async (
  driverId: mongoose.Types.ObjectId,
  mechanicName: string,
  status: 'confirmed' | 'rejected',
  appointmentDate: Date,
  timeSlot: string,
  rejectionReason?: string
) => {
  const title = status === 'confirmed' ? '✅ Randevu Onaylandı' : '❌ Randevu Reddedildi';
  const message = status === 'confirmed' 
    ? `${mechanicName} ustanız ${appointmentDate.toLocaleDateString('tr-TR')} tarihinde ${timeSlot} saatindeki randevunuzu onayladı.`
    : `${mechanicName} ustanız ${appointmentDate.toLocaleDateString('tr-TR')} tarihinde ${timeSlot} saatindeki randevunuzu reddetti.${rejectionReason ? ` Gerekçe: ${rejectionReason}` : ''}`;
  
  return await sendNotification(
    driverId,
    'driver',
    title,
    message,
    status === 'confirmed' ? 'appointment_confirmed' : 'appointment_rejected',
    {
      mechanicName,
      appointmentDate,
      timeSlot,
      rejectionReason,
      priority: 'high'
    }
  );
};

// Hatırlatma bildirimi
export const sendReminderNotification = async (
  userId: mongoose.Types.ObjectId,
  recipientType: 'mechanic' | 'driver',
  appointmentDate: Date,
  timeSlot: string,
  serviceType: string
) => {
  const title = '⏰ Randevu Hatırlatması';
  const message = `Yarın ${appointmentDate.toLocaleDateString('tr-TR')} tarihinde ${timeSlot} saatinde ${serviceType} hizmeti için randevunuz bulunmaktadır.`;
  
  // Yarın sabah 9'da hatırlatma gönder
  const reminderTime = new Date(appointmentDate);
  reminderTime.setDate(reminderTime.getDate() - 1);
  reminderTime.setHours(9, 0, 0, 0);
  
  return await sendNotification(
    userId,
    recipientType,
    title,
    message,
    'reminder',
    {
      appointmentDate,
      timeSlot,
      serviceType,
      priority: 'medium'
    },
    reminderTime
  );
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
      return;
    }

    const pushToken = mechanic.pushToken;

    if (!Expo.isExpoPushToken(pushToken)) {
      return;
    }

    const message = {
      to: pushToken,
      sound: 'default' as const,
      title,
      body,
      data: data || {},
      priority: 'high' as const,
      badge: 1
    };

    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        }
    }

  } catch (error) {
    }
}; 