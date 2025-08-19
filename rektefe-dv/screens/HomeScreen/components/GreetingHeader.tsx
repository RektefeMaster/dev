import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Easing, 
  Modal, 
  Dimensions, 
  FlatList, 
  StatusBar,
  Platform,
  ScrollView
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../constants/config';
import { Swipeable } from 'react-native-gesture-handler';
import io from 'socket.io-client';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../../context/ThemeContext';

interface GreetingHeaderProps {
  userName: string;
  favoriteCar: {
    brand: string;
    model: string;
    plateNumber: string;
  } | null;
}

const { width, height } = Dimensions.get('window');

const getGreeting = (userName: string) => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return `Günaydın ${userName}`;
  } else if (hour >= 12 && hour < 16) {
    return `Tünaydın ${userName}`;
  } else if (hour >= 16 && hour < 22) {
    return `İyi Akşamlar ${userName}`;
  } else {
    return `İyi Geceler ${userName}`;
  }
};

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

export const GreetingHeader: React.FC<GreetingHeaderProps> = ({ userName, favoriteCar }) => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { theme } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [userId, setUserId] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<any>(null);

  // Animasyonlar
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shake = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const handleBaviPress = () => {
    rotateAnim.setValue(0);
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: true,
    }).start(() => {
      if (typeof navigation.openDrawer === 'function') {
        navigation.openDrawer();
      }
    });
  };

  const handleBellPress = () => {
    console.log('🔔 Zil butonuna tıklandı!');
    console.log('📱 Mevcut notifications:', notifications);
    console.log('📱 Mevcut unreadCount:', unreadCount);
    
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      console.log('🎬 Animasyon tamamlandı, bildirimler çekiliyor...');
      fetchNotifications();
      console.log('✅ setShowNotifications(true) çağrıldı');
      setShowNotifications(true);
    });
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('Token bulunamadı, örnek bildirimler gösteriliyor');
        const mockNotifications = [
          {
            _id: '1',
            title: 'Bakım Hatırlatıcısı',
            message: 'Aracınızın bakım zamanı yaklaşıyor. En kısa sürede servise götürmenizi öneririz.',
            type: 'maintenance',
            read: false,
            createdAt: new Date().toISOString(),
            userId: 'user123'
          },
          {
            _id: '2',
            title: 'Randevu Onayı',
            message: 'Yarın saat 14:00\'deki bakım randevunuz onaylandı. Servisimize hoş geldiniz!',
            type: 'appointment_status_update',
            read: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            userId: 'user123'
          },
          {
            _id: '3',
            title: 'Yeni Kampanya',
            message: 'Bu hafta lastik değişiminde %20 indirim fırsatını kaçırmayın!',
            type: 'campaign',
            read: true,
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            userId: 'user123'
          }
        ];
        setNotifications(mockNotifications);
        setLoading(false);
        return;
      }
      
      console.log('API\'den bildirimler çekiliyor...');
      const res = await axios.get(`${API_URL}/users/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('API Response:', res.data);
      
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        console.log('Bildirimler data.data\'dan alındı:', res.data.data.length);
        setNotifications(res.data.data.reverse());
      } else if (res.data && Array.isArray(res.data)) {
        console.log('Bildirimler data\'dan alındı:', res.data.length);
        setNotifications(res.data.reverse());
      } else if (res.data && res.data.notifications && Array.isArray(res.data.notifications)) {
        console.log('Bildirimler data.notifications\'dan alındı:', res.data.notifications.length);
        setNotifications(res.data.notifications.reverse());
      } else {
        console.log('API\'den veri gelmedi, örnek bildirimler gösteriliyor');
        // API'den veri gelmezse örnek bildirimler göster
        const mockNotifications = [
          {
            _id: '1',
            title: 'Bakım Hatırlatıcısı',
            message: 'Aracınızın bakım zamanı yaklaşıyor. En kısa sürede servise götürmenizi öneririz.',
            type: 'maintenance',
            read: false,
            createdAt: new Date().toISOString(),
            userId: 'user123'
          },
          {
            _id: '2',
            title: 'Randevu Onayı',
            message: 'Yarın saat 14:00\'deki bakım randevunuz onaylandı. Servisimize hoş geldiniz!',
            type: 'appointment_status_update',
            read: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            userId: 'user123'
          }
        ];
        setNotifications(mockNotifications);
      }
    } catch (err: any) {
      console.error('Bildirimler alınamadı:', err);
      // Hata durumunda örnek bildirimler göster
      const mockNotifications = [
        {
          _id: '1',
          title: 'Bakım Hatırlatıcısı',
          message: 'Aracınızın bakım zamanı yaklaşıyor. En kısa sürede servise götürmenizi öneririz.',
          type: 'maintenance',
          read: false,
          createdAt: new Date().toISOString(),
          userId: 'user123'
        }
      ];
      setNotifications(mockNotifications);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      console.log('🔄 Bildirim okundu olarak işaretleniyor:', notificationId);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('❌ Token bulunamadı');
        return;
      }
      
      const response = await axios.put(`${API_URL}/users/notifications/read`, {
        notificationId: notificationId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        console.log('✅ Bildirim okundu olarak işaretlendi');
        // Local state'i güncelle
        setNotifications((prev) => 
          prev.map((n) => n._id === notificationId ? { ...n, read: true } : n)
        );
        // Unread count'u güncelle
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('❌ Bildirim okundu işaretleme hatası:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('🔄 Tüm bildirimler okundu olarak işaretleniyor...');
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('❌ Token bulunamadı');
        return;
      }
      
      const response = await axios.put(`${API_URL}/users/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        console.log('✅ Tüm bildirimler okundu olarak işaretlendi');
        // Local state'i güncelle
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error('❌ Tüm bildirimleri okundu işaretleme hatası:', e);
    }
  };

  const handleDeleteNotification = async (notification: any) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/notifications/${notification._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notification._id));
        setShowDeleteModal(false);
        setNotificationToDelete(null);
      }
    } catch (error) {
      console.error('Bildirim silinirken hata:', error);
    }
  };

  const handleNotificationPress = (notification: any) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setSelectedNotification(notification);
    setShowNotifications(false);
  };

  // useEffect hooks
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) setUserId(storedUserId);
      } catch (error) {
        console.error('userId alınırken hata:', error);
      }
    };
    getUserId();
  }, []);

  // useEffect(() => {
  //   fetchNotifications();
  // }, []);

  // Debug için modal state'ini izle
  useEffect(() => {
    console.log('🔍 Modal state değişti:', { showNotifications, notificationsCount: notifications.length });
  }, [showNotifications, notifications]);

  useEffect(() => {
    if (!userId) return;
    
    const socket = io('http://localhost:3000');
    
    socket.on('connect', () => {
      socket.emit('join', userId);
    });
    
    socket.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      
      // Yeni bildirim geldiğinde zili titret
      const newShakeAnim = new Animated.Value(0);
      Animated.sequence([
        Animated.timing(newShakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(newShakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
        Animated.timing(newShakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(newShakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    });
    
    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const renderNotificationItem = ({ item, index }: { item: any; index: number }) => {
    const type = item.type || 'default';
    const color = getNotificationColor(type);
    const isUnread = !item.read;
    
    return (
      <Swipeable
        renderRightActions={() => (
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => {
              setNotificationToDelete(item);
              setShowDeleteModal(true);
            }}
          >
            <Feather name="trash-2" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        friction={2}
        rightThreshold={40}
      >
        <TouchableOpacity
          style={[styles.notificationItem, isUnread && styles.unreadNotification]}
          activeOpacity={0.7}
          onPress={() => handleNotificationPress(item)}
        >
          <View style={styles.notificationContent}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
              <MaterialCommunityIcons 
                name={getNotificationIcon(type)} 
                size={24} 
                color={color} 
              />
            </View>
            
            <View style={styles.notificationText}>
              <View style={styles.notificationHeader}>
                <Text style={[styles.notificationTitle, isUnread && styles.unreadTitle]}>
                  {item.title || 'Bildirim'}
                </Text>
                {isUnread && (
                  <View style={[styles.unreadIndicator, { backgroundColor: color }]} />
                )}
              </View>
              
              {item.message && (
                <Text style={styles.notificationMessage} numberOfLines={3}>
                  {item.message}
                </Text>
              )}
              
              <View style={styles.notificationFooter}>
                <Text style={styles.notificationTime}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR', { 
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) : 'Şimdi'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={handleBaviPress}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.menuGradient}
            >
              <Feather name="menu" size={20} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.notificationButton} 
          onPress={handleBellPress}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate: shake }] }}>
            <LinearGradient
              colors={['#ff9a9e', '#fecfef']}
              style={styles.notificationGradient}
            >
              <Feather name="bell" size={20} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <View style={styles.greetingContainer}>
        <Text style={[styles.greeting, { color: theme.colors.text }]}>{getGreeting(userName)} 👋</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Bugün size nasıl yardımcı olabiliriz?</Text>
      </View>

      {/* Favorite Car */}
      {favoriteCar && (
        <View style={styles.carCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
            style={styles.carGradient}
          >
            <View style={styles.carIcon}>
              <MaterialCommunityIcons name="car" size={24} color="#fff" />
            </View>
            <View style={styles.carInfo}>
              <Text style={styles.carTitle}>Aracınız</Text>
              <Text style={styles.carDetails}>
                {favoriteCar.brand} {favoriteCar.model}
              </Text>
              <Text style={styles.carPlate}>{favoriteCar.plateNumber}</Text>
            </View>
            <TouchableOpacity style={styles.carAction}>
              <Feather name="chevron-right" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* Notifications Modal */}
      <Modal 
        visible={showNotifications} 
        animationType="slide" 
        transparent={false}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerLeft}>
                <MaterialCommunityIcons name="bell" size={28} color="#fff" />
                <Text style={styles.modalTitle}>Bildirimler</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.closeHeaderButton}
                onPress={() => setShowNotifications(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="bell-off" size={64} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
                <Text style={styles.emptyMessage}>
                  Yeni bildirimler geldiğinde burada görünecek
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item, index) => item._id || index.toString()}
                renderItem={renderNotificationItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.notificationsList}
              />
            )}

            {/* Footer Actions */}
            {notifications.length > 0 && unreadCount > 0 && (
              <View style={styles.footerActions}>
                <TouchableOpacity
                  style={styles.markAllButton}
                  onPress={markAllAsRead}
                >
                  <MaterialCommunityIcons name="check-all" size={18} color="#fff" />
                  <Text style={styles.markAllText}>Tümünü Okundu İşaretle</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Notification Detail Modal */}
      <Modal 
        visible={!!selectedNotification} 
        animationType="fade" 
        transparent={true}
        statusBarTranslucent
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContainer}>
            {/* Header */}
            <View style={styles.detailModalHeader}>
              <View style={[
                styles.detailModalIcon, 
                { backgroundColor: getNotificationColor(selectedNotification?.type || 'default') + '20' }
              ]}>
                <MaterialCommunityIcons 
                  name={getNotificationIcon(selectedNotification?.type || 'default')} 
                  size={32} 
                  color={getNotificationColor(selectedNotification?.type || 'default')} 
                />
              </View>
              <TouchableOpacity
                style={styles.detailCloseButton}
                onPress={() => setSelectedNotification(null)}
              >
                <MaterialCommunityIcons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.detailModalContent}>
              <Text style={styles.detailModalTitle}>
                {selectedNotification?.title || 'Bildirim'}
              </Text>
              
              <Text style={styles.detailModalMessage}>
                {selectedNotification?.message || 'Bildirim detayı bulunmuyor.'}
              </Text>
              
              {selectedNotification?.createdAt && (
                <Text style={styles.detailModalTime}>
                  {new Date(selectedNotification.createdAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.detailModalActions}>
              {!selectedNotification?.read && (
                <TouchableOpacity
                  style={styles.detailMarkReadButton}
                  onPress={() => {
                    markAsRead(selectedNotification._id);
                    setSelectedNotification(null);
                  }}
                >
                  <MaterialCommunityIcons name="check" size={18} color="#fff" />
                  <Text style={styles.detailMarkReadText}>Okundu Olarak İşaretle</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  menuButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  notificationGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  greetingContainer: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  carCard: {
    marginBottom: 20,
  },
  carGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  carIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  carInfo: {
    flex: 1,
  },
  carTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginBottom: 4,
  },
  carDetails: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 2,
  },
  carPlate: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    opacity: 0.9,
  },
  carAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeHeaderButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationsList: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  footerActions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  markAllButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  markAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: 'rgba(0, 122, 255, 0.3)',
    borderWidth: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  notificationMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  readButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    flexShrink: 0,
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 16,
    marginVertical: 2,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  detailModal: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailModalContent: {
    marginBottom: 32,
  },
  detailModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  detailModalMessage: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailModalTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  detailModalActions: {
    gap: 16,
  },
  detailMarkReadButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailMarkReadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
