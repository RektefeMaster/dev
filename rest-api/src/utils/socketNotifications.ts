import { Server } from 'socket.io';

// Socket.IO instance'ını global olarak sakla
let ioInstance: Server | null = null;

export function setSocketIOInstance(io: Server) {
  ioInstance = io;
}

// Bildirim gönderme fonksiyonu
export function sendNotificationToUser(userId: string, notification: any) {
  if (ioInstance) {
    ioInstance.to(userId).emit('notification', notification);
  }
}
