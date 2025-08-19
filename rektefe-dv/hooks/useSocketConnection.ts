import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_URL } from '../constants/config';

interface UseSocketConnectionProps {
  token: string | null;
  onNotification?: (notification: any) => void;
}

export const useSocketConnection = ({ token, onNotification }: UseSocketConnectionProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectSocket = () => {
    if (!token) return;

    try {
      const socketUrl = API_URL.replace('/api', '');
      console.log('🔌 Socket.IO bağlantısı kuruluyor:', socketUrl);
      
      const newSocket = io(socketUrl, {
        timeout: 60000, // 60 saniye timeout
        reconnection: true, // Otomatik yeniden bağlanma aktif
        reconnectionAttempts: 3, // 3 deneme
        reconnectionDelay: 2000, // 2 saniye gecikme
        reconnectionDelayMax: 10000, // Maksimum 10 saniye gecikme
        maxReconnectionAttempts: 3, // Maksimum 3 deneme
        transports: ['polling'], // SADECE POLLING - KARARLI BAĞLANTI
        upgrade: false, // Transport upgrade devre dışı
        rememberUpgrade: false, // Upgrade'i hatırlama
        auth: {
          token: token
        },
        // Daha kararlı bağlantı için
        forceNew: true, // Yeni bağlantı zorla
        multiplex: false // Multiplexing devre dışı
      });

      // Bağlantı başarılı
      newSocket.on('connect', () => {
        console.log('✅ Socket.IO bağlantısı başarılı');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Kullanıcı ID'sini al ve odaya katıl
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.userId;
          
          newSocket.emit('join', userId);
          console.log('👤 Kullanıcı odasına katıldı:', userId);
        } catch (error) {
          console.error('❌ Token decode hatası:', error);
        }
      });

      // Bağlantı hatası
      newSocket.on('connect_error', (error: any) => {
        console.error('❌ Socket.IO bağlantı hatası:', error.message);
        setIsConnected(false);
        setConnectionError(error.message);
        
        // Socket.IO'nun kendi reconnection'ı çalışacak
        console.log('🔄 Socket.IO otomatik yeniden bağlanma aktif');
      });

      // Bağlantı kesildi
      newSocket.on('disconnect', (reason: string) => {
        console.log('🔌 Socket.IO bağlantısı kesildi:', reason);
        setIsConnected(false);
        
        // Socket.IO'nun kendi reconnection'ı çalışacak
        if (reason === 'io server disconnect') {
          console.log('🔄 Sunucu bağlantıyı kesti, otomatik yeniden bağlanma bekleniyor...');
        } else if (reason === 'ping timeout') {
          console.log('⏰ Ping timeout, otomatik yeniden bağlanma bekleniyor...');
        }
      });

      // Reconnection event'leri
      newSocket.on('reconnect', (attemptNumber: number) => {
        console.log(`✅ Socket.IO yeniden bağlandı! Deneme: ${attemptNumber}`);
        setIsConnected(true);
        setConnectionError(null);
        
        // Kullanıcı ID'sini al ve odaya katıl
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.userId;
          
          newSocket.emit('join', userId);
          console.log('👤 Kullanıcı odasına yeniden katıldı:', userId);
        } catch (error) {
          console.error('❌ Token decode hatası:', error);
        }
      });

      newSocket.on('reconnect_attempt', (attemptNumber: number) => {
        console.log(`🔄 Socket.IO yeniden bağlanma denemesi: ${attemptNumber}`);
      });

      newSocket.on('reconnect_error', (error: any) => {
        console.error('❌ Socket.IO yeniden bağlanma hatası:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Socket.IO yeniden bağlanma başarısız');
        setConnectionError('Yeniden bağlanma başarısız. Lütfen internet bağlantınızı kontrol edin.');
      });

      // Bildirim dinle
      if (onNotification) {
        newSocket.on('notification', onNotification);
      }

      setSocket(newSocket);
    } catch (error) {
      console.error('❌ Socket.IO başlatma hatası:', error);
      setConnectionError('Socket.IO başlatılamadı');
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      console.log('🔌 Socket.IO bağlantısı kapatılıyor');
      socket.close();
      setSocket(null);
      setIsConnected(false);
      setConnectionError(null);
    }
    
    // Timeout'ları temizle
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  };

  // Token değiştiğinde bağlantıyı yeniden kur
  useEffect(() => {
    if (token) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [token]);

  // Component unmount olduğunda temizlik
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  return {
    socket,
    isConnected,
    connectionError,
    connectSocket,
    disconnectSocket
  };
};
