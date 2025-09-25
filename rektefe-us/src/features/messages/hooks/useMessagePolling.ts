import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';
import { Message } from '@/shared/types';

export const useMessagePolling = (conversationId: string) => {
  const { token, userId } = useAuth();
  const [isPolling, setIsPolling] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [newMessages, setNewMessages] = useState<Message[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false); // Ref ile polling durumunu takip et
  
  const startPolling = useCallback(async () => {
    if (isPollingRef.current || !token || conversationId.startsWith('temp_')) return;
    
    isPollingRef.current = true;
    setIsPolling(true);
    
    try {
      const response = await apiService.pollMessages(lastMessageId || undefined);
      
      if (response.success) {
        if (response.data && response.data.length > 0) {
          // Yeni mesajları state'e ekle
          setNewMessages(prev => [...prev, ...(response.data || [])]);
          
          // Son mesaj ID'sini güncelle
          const lastMessage = response.data[response.data.length - 1];
          if (lastMessage && lastMessage._id) {
            setLastMessageId(lastMessage._id);
          }
          
          // Yeni mesajlar geldi, polling'i durdur
          isPollingRef.current = false;
          setIsPolling(false);
          return response.data;
        } else {
          // Yeni mesaj yoksa 5 saniye sonra tekrar dene
          pollTimeoutRef.current = setTimeout(() => {
            isPollingRef.current = false;
            setIsPolling(false);
            startPolling();
          }, 5000);
        }
      }
    } catch (error) {
      isPollingRef.current = false;
      setIsPolling(false);
      
      // Hata durumunda 10 saniye sonra tekrar dene
      pollTimeoutRef.current = setTimeout(() => {
        startPolling();
      }, 10000);
    }
  }, [lastMessageId]); // ✅ Sadece lastMessageId değiştiğinde çalışsın
  
  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setIsPolling(false);
  }, []); // ✅ Boş dependency array
  
  // Component mount olduğunda polling başlat
  useEffect(() => {
    if (conversationId && !conversationId.startsWith('temp_') && token) {
      startPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [conversationId]); // ✅ Sadece conversationId değiştiğinde çalışsın
  
  // Yeni mesajlar geldiğinde callback çağır
  const onNewMessages = useCallback((callback: (messages: Message[]) => void) => {
    if (newMessages.length > 0) {
      callback(newMessages);
      setNewMessages([]); // Mesajları temizle
    }
  }, [newMessages]);
  
  return {
    startPolling,
    stopPolling,
    isPolling,
    newMessages,
    onNewMessages,
    lastMessageId
  };
};

export default useMessagePolling;
