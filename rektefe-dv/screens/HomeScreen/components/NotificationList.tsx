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
import { API_URL } from '../../../constants/config';
import { useTheme } from '../../../context/ThemeContext';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationListProps {
  userId: string;
  onNotificationCountChange: (count: number) => void;
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
    default:
      return 'bell';
  }
};

export const NotificationList: React.FC<NotificationListProps> = ({ 
  userId, 
  onNotificationCountChange 
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
      const token = await AsyncStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/notifications/driver`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const notificationsData = response.data.data || [];
        setNotifications(notificationsData);
        
        if (Array.isArray(notificationsData)) {
          const unread = notificationsData.filter((n: Notification) => !n.read).length;
          setUnreadCount(unread);
          onNotificationCountChange(unread);
        } else {
          setUnreadCount(0);
          onNotificationCountChange(0);
        }
      }
    } catch (error) {
      console.error('Bildirimler getirilemedi:', error);
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
          n._id === notificationId ? { ...n, read: true } : n
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
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
      if (deletedNotification && !deletedNotification.read) {
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
    if (!notification.read) {
      markAsRead(notification._id);
    }
    setSelectedNotification(notification);
  };

  const handleDeletePress = (notification: Notification) => {
    setNotificationToDelete(notification);
    setShowDeleteModal(true);
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <MaterialCommunityIcons
          name={getNotificationIcon(item.type) as any}
          size={24}
          color={getNotificationColor(item.type)}
        />
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
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
});
