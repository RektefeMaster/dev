import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { API_CONFIG } from '@/constants/config';

// Socket event interfaces
export interface EmergencyTowingData {
  requestId: string;
  userId: string;
  vehicleInfo: {
    type: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
  };
  location: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: string;
    accuracy: number;
  };
  userInfo: {
    name: string;
    surname: string;
    phone: string;
  };
  emergencyDetails: {
    reason: string;
    description: string;
    severity: 'critical' | 'high' | 'medium';
  };
  createdAt: Date;
}

export interface MechanicResponse {
  requestId: string;
  mechanicId: string;
  response: 'accepted' | 'rejected';
  estimatedArrival?: number;
  message?: string;
}

export interface LocationUpdate {
  requestId: string;
  mechanicId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: Date;
}

interface UseSocketOptions {
  onNotification?: (notification: any) => void;
  onMechanicResponse?: (response: MechanicResponse) => void;
  onLocationUpdate?: (update: LocationUpdate) => void;
  onTowingRequestUpdate?: (data: any) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { token, userId } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    onNotification,
    onMechanicResponse,
    onLocationUpdate,
    onTowingRequestUpdate
  } = options;

  const cleanupSocket = useCallback(() => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      setSocket(null);
    }
    setIsConnected(false);
    setIsReconnecting(false);
    setConnectionError(null);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [socket]);

  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setConnectionError('Maksimum yeniden bağlanma denemesi aşıldı');
      setIsReconnecting(false);
      return;
    }

    setIsReconnecting(true);
    reconnectAttempts.current += 1;
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isConnected && token && userId) {
        connectSocket();
      }
    }, delay);
  }, [isConnected, token, userId]);

  const connectSocket = useCallback(() => {
    if (!token || !userId) {
      console.log('🔍 Socket: Token veya userId eksik');
      return;
    }

    try {
      cleanupSocket();

      const socketUrl = API_CONFIG.SOCKET_URL;
      console.log('🔍 Socket: Bağlanıyor -', socketUrl);

      const newSocket = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['polling', 'websocket'],
        timeout: 20000,
        reconnection: false, // Manuel yeniden bağlanma kontrolü
        forceNew: true,
        upgrade: true,
        rememberUpgrade: false
      });

      // Bağlantı olayları
      newSocket.on('connect', () => {
        console.log('✅ Socket: Bağlandı');
        setIsConnected(true);
        setIsReconnecting(false);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Kullanıcı odasına katıl
        newSocket.emit('join', userId);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('⚠️ Socket: Bağlantı kesildi -', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Sunucu tarafından kesildi, yeniden bağlan
          handleReconnect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.log('❌ Socket: Bağlantı hatası -', error.message);
        setIsConnected(false);
        setConnectionError(error.message);
        handleReconnect();
      });

      // Event listeners
      if (onNotification) {
        newSocket.on('notification', onNotification);
      }

      if (onMechanicResponse) {
        newSocket.on('mechanic_response', onMechanicResponse);
      }

      if (onLocationUpdate) {
        newSocket.on('location_update', onLocationUpdate);
      }

      if (onTowingRequestUpdate) {
        newSocket.on('towing_request_update', onTowingRequestUpdate);
      }

      // Genel event listeners
      newSocket.on('emergency_towing_accepted', (data) => {
        console.log('🚗 Çekici talebi kabul edildi:', data);
      });

      newSocket.on('emergency_towing_rejected', (data) => {
        console.log('❌ Çekici talebi reddedildi:', data);
      });

      setSocket(newSocket);

    } catch (error: any) {
      console.log('❌ Socket: Bağlantı hatası -', error.message);
      setConnectionError(error.message);
      handleReconnect();
    }
  }, [token, userId, cleanupSocket, handleReconnect, onNotification, onMechanicResponse, onLocationUpdate, onTowingRequestUpdate]);

  // Socket methods
  const sendEmergencyTowingRequest = useCallback((data: EmergencyTowingData) => {
    if (socket && isConnected) {
      console.log('🚗 Çekici talebi gönderiliyor:', data);
      socket.emit('emergency_towing_request', data);
      return true;
    }
    console.log('❌ Socket bağlı değil, çekici talebi gönderilemedi');
    return false;
  }, [socket, isConnected]);

  const sendLocationUpdate = useCallback((data: LocationUpdate) => {
    if (socket && isConnected) {
      socket.emit('location_update', data);
      return true;
    }
    return false;
  }, [socket, isConnected]);

  const joinRoom = useCallback((roomId: string) => {
    if (socket && isConnected) {
      socket.emit('join_room', roomId);
      return true;
    }
    return false;
  }, [socket, isConnected]);

  const leaveRoom = useCallback((roomId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_room', roomId);
      return true;
    }
    return false;
  }, [socket, isConnected]);

  // Effects
  useEffect(() => {
    if (token && userId) {
      connectSocket();
    } else {
      cleanupSocket();
    }

    return cleanupSocket;
  }, [token, userId, connectSocket, cleanupSocket]);

  return {
    socket,
    isConnected,
    isReconnecting,
    connectionError,
    sendEmergencyTowingRequest,
    sendLocationUpdate,
    joinRoom,
    leaveRoom,
    reconnect: connectSocket,
    disconnect: cleanupSocket
  };
};
