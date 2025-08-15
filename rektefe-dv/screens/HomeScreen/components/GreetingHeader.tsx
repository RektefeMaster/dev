import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Modal, Dimensions, ActivityIndicator, Alert, FlatList } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { BlurView } from 'expo-blur';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../constants/config';
import { Swipeable } from 'react-native-gesture-handler';
import io from 'socket.io-client';
import WheelPicker from 'react-native-wheel-picker-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../context/AuthContext';

interface GreetingHeaderProps {
  userName: string;
  favoriteCar: {
    brand: string;
    model: string;
    plateNumber: string;
  } | null;
}

const getGreeting = (userName: string) => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return `Günaydın ${userName}`;
  if (hour >= 12 && hour < 18) return `İyi akşamlar ${userName}`;
  return `İyi geceler ${userName}`;
};

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'important':
      return '#FF3B30';
    case 'warning':
      return '#FF9500';
    case 'success':
      return '#34C759';
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
    default:
      return 'bell';
  }
};

export const GreetingHeader: React.FC<GreetingHeaderProps> = ({ userName, favoriteCar }) => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadCount = useRef(0);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [prevNotificationsLength, setPrevNotificationsLength] = useState(0);
  const [userId, setUserId] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<any>(null);

  const handleBaviPress = () => {
    rotateAnim.setValue(0);
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => {
      if (typeof navigation.openDrawer === 'function') {
        navigation.openDrawer();
      }
    });
  };

  const handleBellPress = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => {
      fetchNotifications();
      setShowNotifications(true);
    });
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Token bulunamadı');
      const res = await axios.get(`${API_URL}/users/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.reverse()); // son gelen en üstte olsun
    } catch (err: any) {
      setError('Bildirimler alınamadı');
    } finally {
      setLoading(false);
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

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shake = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });

  // Bildirimleri çekince okunmamışları say
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
    // Eğer yeni okunmamış bildirim geldiyse zil titresin
    if (count > prevUnreadCount.current) {
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
    prevUnreadCount.current = count;
  }, [notifications]);

  // Bildirimi okundu olarak işaretle
  const markAsRead = async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${API_URL}/users/notifications/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) => prev.map((n) => n._id === notificationId ? { ...n, read: true } : n));
    } catch (e) {
      // Hata olursa sessiz geç
    }
  };

  // Bildirime tıklanınca detay modalı aç
  const handleNotificationPress = (notification: any) => {
    // Tıklama animasyonu
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedNotification(notification);
    setShowNotifications(false);
  };

  useEffect(() => {
    // Bildirimleri ilk açılışta çek
    fetchNotifications();
  }, []);

  // Bildirimler değiştiğinde kontrol et
  useEffect(() => {
    if (notifications.length > prevNotificationsLength) {
      // Yeni bildirim geldi, zili titret
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
      ]).start();
    }
    setPrevNotificationsLength(notifications.length);
  }, [notifications]);

  useEffect(() => {
    const socket = io('http://localhost:3000'); // Sunucu adresin
    socket.emit('join', userId); // userId ile odaya katıl
    socket.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
      ]).start();
    });
    return () => {
      socket.disconnect();
    };
  }, [userId]);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <TouchableOpacity onPress={handleBaviPress} activeOpacity={0.7}>
          <Animated.Text style={[styles.logo, { transform: [{ rotate }] }]}>🔷</Animated.Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBellPress} activeOpacity={0.7} style={{position:'relative'}}>
          <Animated.View style={{ transform: [{ rotate: shake }] }}>
            <MaterialCommunityIcons name="bell" size={24} color="#fff" style={{ opacity: 0.9 }} />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -4,
                backgroundColor: 'red',
                borderRadius: 8,
                minWidth: 16,
                height: 16,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 3,
                zIndex: 10,
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{unreadCount}</Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.greeting}>
        {getGreeting(userName)} 👋
      </Text>

      {favoriteCar && (
        <View style={styles.carRow}>
          <MaterialCommunityIcons 
            name="car" 
            size={24} 
            color="#fff" 
            style={{ opacity: 0.9, marginRight: 12 }} 
          />
          <Text style={styles.carText}>
            {favoriteCar.brand} {favoriteCar.model} ({favoriteCar.plateNumber}) aracınız için ne yapmak istersiniz?
          </Text>
        </View>
      )}

      {/* Bildirimler ve Silme Onay Modalı (tek modal) */}
      <Modal visible={showNotifications} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            backgroundColor: '#1C1C1E', 
            borderRadius: 20, 
            padding: 20, 
            width: '90%', 
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5
          }}>
            {showDeleteModal ? (
              // Silme Onay İçeriği
              <>
                <MaterialCommunityIcons name="alert-circle" size={48} color="#FF3B30" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' }}>Bildirimi Sil</Text>
                <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 24 }}>Bu bildirimi silmek istediğinizden emin misiniz?</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                  <TouchableOpacity
                    style={{ backgroundColor: '#2C2C2E', borderRadius: 12, padding: 12, flex: 1, marginRight: 8 }}
                    onPress={() => {
                      setShowDeleteModal(false);
                      setNotificationToDelete(null);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#FF3B30', borderRadius: 12, padding: 12, flex: 1, marginLeft: 8 }}
                    onPress={() => {
                      handleDeleteNotification(notificationToDelete);
                      setShowDeleteModal(false);
                      setNotificationToDelete(null);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Bildirimler Listesi İçeriği
              <>
                <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#fff' }}>Bildirimler</Text>
                <View style={{ 
                  height: ITEM_HEIGHT * VISIBLE_ITEMS, 
                  width: 300,
                  overflow: 'hidden',
                  borderRadius: 12,
                  backgroundColor: '#2C2C2E'
                }}>
                  <LinearGradient
                    colors={['rgba(28,28,30,0.9)', 'transparent']}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, zIndex: 1 }}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(28,28,30,0.9)']}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, zIndex: 1 }}
                  />
                  <FlatList
                    data={notifications.length > 0 ? notifications : [{ title: 'Test 1' }, { title: 'Test 2' }, { title: 'Test 3' }]}
                    keyExtractor={(_, idx) => idx.toString()}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    bounces={false}
                    style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, width: 300 }}
                    contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                    getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                    onScroll={e => {
                      const offsetY = e.nativeEvent.contentOffset.y;
                      const idx = Math.round(offsetY / ITEM_HEIGHT);
                      setSelectedIndex(idx);
                    }}
                    renderItem={({ item, index }) => {
                      const center = selectedIndex;
                      const distance = Math.abs(center - index);
                      const scale = distance === 0 ? 1.2 : 1 - distance * 0.15;
                      const opacity = distance === 0 ? 1 : 0.4;
                      const type = item.type || 'default';
                      const color = getNotificationColor(type);
                      return (
                        <Swipeable
                          renderRightActions={() => (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#FF3B30',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: 80,
                                height: '100%',
                                borderRadius: 12,
                                marginVertical: 2
                              }}
                              onPress={() => {
                                setNotificationToDelete(item);
                                setShowDeleteModal(true);
                              }}
                            >
                              <MaterialCommunityIcons name="delete" size={24} color="#fff" />
                            </TouchableOpacity>
                          )}
                          friction={2}
                          rightThreshold={40}
                        >
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleNotificationPress(item)}
                          >
                            <Animated.View 
                              style={{ 
                                height: ITEM_HEIGHT, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                opacity,
                                transform: [{ scale }],
                                backgroundColor: distance === 0 ? '#3A3A3C' : 'transparent',
                                borderRadius: 8,
                                marginHorizontal: 8,
                                marginVertical: 2,
                                shadowColor: distance === 0 ? color : 'transparent',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: distance === 0 ? 5 : 0
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                                <MaterialCommunityIcons 
                                  name={getNotificationIcon(type)} 
                                  size={distance === 0 ? 24 : 20} 
                                  color={color} 
                                  style={{ marginRight: 8 }}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ 
                                    color: distance === 0 ? '#fff' : '#aaa', 
                                    fontSize: distance === 0 ? 18 : 14, 
                                    fontWeight: distance === 0 ? 'bold' : 'normal',
                                    marginBottom: 2
                                  }}>
                                    {item.title || item.type || item}
                                  </Text>
                                  {item.createdAt && (
                                    <Text style={{ 
                                      color: '#666', 
                                      fontSize: 12,
                                      opacity: distance === 0 ? 1 : 0.6
                                    }}>
                                      {new Date(item.createdAt).toLocaleTimeString('tr-TR', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </Text>
                                  )}
                                </View>
                                {!item.read && distance === 0 && (
                                  <View style={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: 4, 
                                    backgroundColor: color,
                                    marginLeft: 8
                                  }} />
                                )}
                              </View>
                            </Animated.View>
                          </TouchableOpacity>
                        </Swipeable>
                      );
                    }}
                    initialScrollIndex={selectedIndex}
                  />
                </View>
                <TouchableOpacity 
                  style={{ marginTop: 16 }} 
                  onPress={() => setShowNotifications(false)}
                >
                  <Text style={{ color: '#666', fontSize: 14 }}>Kapat</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Bildirim Detay Modalı */}
      <Modal visible={!!selectedNotification} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View 
            style={{ 
              backgroundColor: '#1C1C1E',
              borderRadius: 20,
              padding: 20,
              width: '90%',
              alignItems: 'center',
              transform: [{ scale: scaleAnim }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5
            }}
          >
            <View style={{ 
              width: 50, 
              height: 50, 
              borderRadius: 25, 
              backgroundColor: getNotificationColor(selectedNotification?.type || 'default'),
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <MaterialCommunityIcons 
                name={getNotificationIcon(selectedNotification?.type || 'default')} 
                size={30} 
                color="#fff" 
              />
            </View>

            <Text style={{ 
              fontSize: 24, 
              fontWeight: 'bold', 
              color: '#fff',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              {selectedNotification?.title || selectedNotification?.type || 'Bildirim'}
            </Text>

            {selectedNotification?.createdAt && (
              <Text style={{ 
                color: '#666', 
                fontSize: 14,
                marginBottom: 16
              }}>
                {new Date(selectedNotification.createdAt).toLocaleString('tr-TR')}
              </Text>
            )}

            <Text style={{ 
              color: '#fff', 
              fontSize: 16,
              lineHeight: 24,
              textAlign: 'center',
              marginBottom: 24
            }}>
              {selectedNotification?.message || 'Bildirim detayı bulunmuyor.'}
            </Text>

            <TouchableOpacity
              style={{ 
                backgroundColor: '#007AFF', 
                borderRadius: 12, 
                padding: 12, 
                width: 200, 
                alignItems: 'center',
                shadowColor: '#007AFF',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3
              }}
              onPress={() => setSelectedNotification(null)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Kapat</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    opacity: 0.9,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  // greetingName artık kullanılmıyor çünkü isim selamlama içinde
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 16,
  },
  carText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: 'rgba(30,30,40,0.85)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 18,
  },
  notificationItem: {
    width: '100%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    height: 80,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  notificationDesc: {
    fontSize: 14,
    color: '#d0d0e0',
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#222',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '90%',
    borderRadius: 16,
    marginVertical: 4,
    flexDirection: 'column',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 4,
  },
}); 