import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  Alert
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/config';
import { useTheme } from '@/context/ThemeContext';
import { apiService } from '@/shared/services/api';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    appointmentId?: string;
    mechanicId?: string;
    mechanicName?: string;
    serviceType?: string;
    quoteCount?: number;
    priceRange?: string;
    serviceCategory?: string;
    amount?: string;
    [key: string]: any;
  };
}

interface NotificationListProps {
  userId: string;
  onNotificationCountChange: (count: number) => void;
  navigation?: any;
}

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'important':
      return '#FF3B30';
    case 'warning':
      return '#FF9500';
    case 'success':
      return '#34C759';
    case 'appointment_status_update':
      return '#007AFF';
    default:
      return '#007AFF';
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'important':
      return 'alert-circle';
    case 'warning':
      return 'alert';
    case 'success':
      return 'check-circle';
    case 'appointment_status_update':
      return 'calendar-clock';
    case 'quote_received':
      return 'currency-try';
    case 'payment_confirmation':
      return 'checkmark-circle';
    case 'rating_reminder':
      return 'star';
    default:
      return 'bell';
  }
};

export const NotificationList: React.FC<NotificationListProps> = ({ 
  userId, 
  onNotificationCountChange,
  navigation 
}) => {
  const { colors } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log('🔍 NotificationList: Bildirimler getiriliyor...');
      console.log('🔍 NotificationList: userId:', userId);
      
      const response = await apiService.getNotifications();
      console.log('📱 NotificationList API Response:', JSON.stringify(response, null, 2));
      
      // API response formatını kontrol et
      let notificationsData: Notification[] = [];
      if (response && response.success && response.data && Array.isArray(response.data.notifications)) {
        notificationsData = response.data.notifications;
      } else if (response && response.success && Array.isArray(response.data)) {
        notificationsData = response.data;
      } else if (Array.isArray(response)) {
        notificationsData = response;
      } else {
        console.log('⚠️ NotificationList: Beklenmeyen API response formatı:', response);
        notificationsData = [];
      }
      
      setNotifications(notificationsData);
      console.log('✅ NotificationList: Bildirimler yüklendi:', notificationsData.length);
      
      const unread = notificationsData.filter((n: Notification) => !n.isRead).length;
      setUnreadCount(unread);
      onNotificationCountChange(unread);
    } catch (error) {
      console.error('❌ NotificationList: Bildirimler getirilemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Local state'i güncelle
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      
      const newUnreadCount = unreadCount - 1;
      setUnreadCount(newUnreadCount);
      onNotificationCountChange(newUnreadCount);
    } catch (error) {
      console.error('Bildirim okundu olarak işaretlenemedi:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      await axios.put(`${API_URL}/users/notifications/read-all`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Local state'i güncelle
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      onNotificationCountChange(0);
    } catch (error) {
      console.error('Tüm bildirimler okundu olarak işaretlenemedi:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      await axios.delete(`${API_URL}/users/notifications/${notificationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Local state'i güncelle
      const deletedNotification = notifications.find(n => n._id === notificationId);
      if (deletedNotification && !deletedNotification.isRead) {
        const newUnreadCount = unreadCount - 1;
        setUnreadCount(newUnreadCount);
        onNotificationCountChange(newUnreadCount);
      }
      
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setShowDeleteModal(false);
      setNotificationToDelete(null);
    } catch (error) {
      console.error('Bildirim silinemedi:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    console.log('Bildirime tıklandı:', notification);

    // Rating reminder bildirimi ise sadece okundu işaretle, buton ile Rating ekranına gidilecek
    if (notification.type === 'rating_reminder') {
      console.log('⭐ Rating reminder bildirimi tıklandı - sadece okundu işaretleniyor');
      
      if (!notification.isRead) {
        markAsRead(notification._id);
      }
      setSelectedNotification(notification);
      return;
    }

    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    setSelectedNotification(notification);
  };

  const handleDeletePress = (notification: Notification) => {
    setNotificationToDelete(notification);
    setShowDeleteModal(true);
  };

  const handleRatingPress = (notification: Notification) => {
    console.log('⭐ Puan Ver butonuna tıklandı:', notification);
    
    // Modal'ı kapat
    setShowNotifications(false);
    
    // Direkt Rating ekranına yönlendir
    if (navigation) {
      try {
        navigation.navigate('Rating', {
          appointmentId: notification.data?.appointmentId || 'real-appointment-123',
          mechanicId: notification.data?.mechanicId || 'real-mechanic-123',
          mechanicName: notification.data?.mechanicName || 'Test Usta'
        });
        console.log('✅ Puan Ver butonu: Rating ekranına yönlendirildi');
      } catch (navError) {
        console.error('❌ Puan Ver butonu navigation hatası:', navError);
      }
    } else {
      // Fallback: AsyncStorage'a kaydet
        const ratingData = {
          appointmentId: notification.data?.appointmentId || 'real-appointment-123',
          mechanicId: notification.data?.mechanicId || 'real-mechanic-123',
          mechanicName: notification.data?.mechanicName || 'Test Usta',
          serviceType: notification.data?.serviceType || 'Motor Yağı Değişimi',
          timestamp: new Date().toISOString()
        };
      AsyncStorage.setItem('pendingRating', JSON.stringify(ratingData));
      console.log('💾 Puan Ver butonu fallback: Rating verisi kaydedildi');
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isQuoteNotification = item.type === 'quote_received';
    const isPaymentNotification = item.type === 'payment_confirmation';
    const isRatingNotification = item.type === 'rating_reminder';
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.isRead && styles.unreadNotification,
          isQuoteNotification && styles.quoteNotification,
          isPaymentNotification && styles.paymentNotification,
          isRatingNotification && styles.ratingNotification
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[
          styles.notificationIcon,
          isQuoteNotification && styles.quoteIcon,
          isPaymentNotification && styles.paymentIcon,
          isRatingNotification && styles.ratingIcon
        ]}>
          <MaterialCommunityIcons
            name={getNotificationIcon(item.type) as any}
            size={24}
            color={isQuoteNotification ? '#4CAF50' : isPaymentNotification ? '#2196F3' : isRatingNotification ? '#F59E0B' : getNotificationColor(item.type)}
          />
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={[
            styles.notificationTitle,
            isQuoteNotification && styles.quoteTitle,
            isPaymentNotification && styles.paymentTitle,
            isRatingNotification && styles.ratingTitle
          ]}>
            {item.title}
          </Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          
          {/* Fiyat teklifi bildirimi için ek detaylar */}
          {isQuoteNotification && item.data && (
            <View style={styles.quoteDetails}>
              <Text style={styles.quoteDetailText}>
                {item.data.quoteCount} teklif • {item.data.priceRange}
              </Text>
              <Text style={styles.quoteServiceText}>
                {item.data.serviceCategory}
              </Text>
            </View>
          )}
          
          {/* Ödeme bildirimi için ek detaylar */}
          {isPaymentNotification && item.data && (
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentDetailText}>
                Ödeme Onaylandı • {item.data.amount}₺
              </Text>
            </View>
          )}
          
          {/* Puanlama bildirimi için ek detaylar ve buton */}
          {isRatingNotification && item.data && (
            <View style={styles.ratingDetails}>
              <Text style={styles.ratingDetailText}>
                Deneyiminizi değerlendirin • {item.data.serviceType}
              </Text>
              <Text style={styles.ratingMechanicText}>
                {item.data.mechanicName}
              </Text>
              
              {/* Puan Ver Butonu */}
              <TouchableOpacity
                style={styles.ratingButton}
                onPress={() => handleRatingPress(item)}
              >
                <MaterialCommunityIcons name="star" size={16} color="#FFFFFF" />
                <Text style={styles.ratingButtonText}>Puan Ver</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <Text style={styles.notificationTime}>
            {new Date(item.createdAt).toLocaleString('tr-TR')}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePress(item)}
        >
          <MaterialCommunityIcons name="delete" size={20} color={colors.error.main} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={() => setShowNotifications(true)}
      >
        <MaterialCommunityIcons name="bell" size={24} color={colors.text.primary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bildirimler</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={markAllAsRead}
                >
                  <Text style={styles.actionButtonText}>Tümünü Okundu İşaretle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowNotifications(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={notifications}
              renderItem={renderNotificationItem}
              keyExtractor={(item) => item._id}
              style={styles.notificationsList}
              showsVerticalScrollIndicator={false}
            />

            {notifications.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="bell-off" size={48} color={colors.text.secondary} />
                <Text style={styles.emptyStateText}>Henüz bildirim yok</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Bildirimi Sil</Text>
            <Text style={styles.deleteModalMessage}>
              Bu bildirimi silmek istediğinizden emin misiniz?
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmButton]}
                onPress={() => notificationToDelete && deleteNotification(notificationToDelete._id)}
              >
                <Text style={styles.confirmButtonText}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 15,
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  notificationsList: {
    maxHeight: 400,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  unreadNotification: {
    backgroundColor: '#F8F9FA',
  },
  notificationIcon: {
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deleteModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButtonText: {
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  confirmButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Fiyat teklifi bildirimi stilleri - Modern ve temiz
  quoteNotification: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  quoteIcon: {
    backgroundColor: '#D1FAE5',
  },
  quoteTitle: {
    color: '#047857',
    fontWeight: '600',
  },
  quoteDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  quoteDetailText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
    lineHeight: 20,
  },
  quoteServiceText: {
    fontSize: 13,
    color: '#059669',
    marginTop: 6,
    fontWeight: '500',
  },
  // Ödeme bildirimi stilleri - Modern ve temiz
  paymentNotification: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  paymentIcon: {
    backgroundColor: '#DBEAFE',
  },
  paymentTitle: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  paymentDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentDetailText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
    lineHeight: 20,
  },
  // Puanlama bildirimi stilleri - Modern ve temiz
  ratingNotification: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  ratingIcon: {
    backgroundColor: '#EFF6FF',
  },
  ratingTitle: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  ratingDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ratingDetailText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 20,
  },
  ratingMechanicText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
