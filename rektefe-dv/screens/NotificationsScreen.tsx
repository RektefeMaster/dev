import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Alert,
  Modal,
  ScrollView,
  TextInput
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/theme';
import { apiService } from '../services/api';
import Background from '../components/Background';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  isRead: boolean;
  createdAt: string;
  data?: any;
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
    case 'payment':
      return '#8B5CF6';
    case 'service':
      return '#10B981';
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
    case 'payment':
      return 'credit-card';
    case 'service':
      return 'wrench';
    default:
      return 'bell';
  }
};

const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) return 'Az önce';
  if (diffInHours < 24) return `${Math.floor(diffInHours)} saat önce`;
  if (diffInHours < 48) return 'Dün';
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} gün önce`;
  
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getNotificationTypeLabel = (type: string): string => {
  switch (type) {
    case 'appointment_confirmed':
      return 'Randevu Onaylandı';
    case 'appointment_request':
      return 'Randevu Talebi';
    case 'appointment_rejected':
      return 'Randevu Reddedildi';
    case 'reminder':
      return 'Hatırlatma';
    case 'system':
      return 'Sistem Bildirimi';
    case 'payment':
      return 'Ödeme';
    case 'service':
      return 'Hizmet';
    default:
      return 'Bildirim';
  }
};

const shouldShowActionButton = (type: string): boolean => {
  return ['appointment_confirmed', 'appointment_request', 'reminder', 'payment', 'service'].includes(type);
};

const getActionButtonText = (type: string): string => {
  switch (type) {
    case 'appointment_confirmed':
    case 'appointment_request':
    case 'reminder':
      return 'Randevuları Görüntüle';
    case 'payment':
      return 'Cüzdanı Aç';
    case 'service':
      return 'Garajı Aç';
    default:
      return 'Detayları Görüntüle';
  }
};

const getNotificationPriority = (type: string): 'high' | 'medium' | 'low' => {
  const priorityMap: { [key: string]: 'high' | 'medium' | 'low' } = {
    'emergency': 'high',
    'fault_report': 'high',
    'towing': 'high',
    'appointment_confirmed': 'medium',
    'appointment_request': 'medium',
    'payment': 'medium',
    'maintenance': 'medium',
    'reminder': 'medium',
    'message': 'medium',
    'rating': 'low',
    'promotion': 'low',
    'update': 'low',
    'system': 'low',
    'general': 'low'
  };
  return priorityMap[type] || 'medium';
};

const getNotificationCategory = (type: string): string => {
  const categoryMap: { [key: string]: string } = {
    'appointment_confirmed': 'Randevular',
    'appointment_request': 'Randevular',
    'payment': 'Ödemeler',
    'maintenance': 'Bakım',
    'emergency': 'Acil Durumlar',
    'fault_report': 'Arıza Bildirimleri',
    'towing': 'Çekici Hizmetleri',
    'wash': 'Yıkama Hizmetleri',
    'tire_parts': 'Lastik & Parça',
    'garage': 'Garaj Hizmetleri',
    'mechanic': 'Usta Hizmetleri',
    'rating': 'Değerlendirmeler',
    'message': 'Mesajlar',
    'wallet': 'Cüzdan',
    'points': 'Puanlar',
    'system': 'Sistem',
    'promotion': 'Promosyonlar',
    'reminder': 'Hatırlatmalar',
    'update': 'Güncellemeler',
    'service': 'Hizmetler',
    'general': 'Genel'
  };
  return categoryMap[type] || 'Diğer';
};


const NotificationsScreen = ({ navigation }: any) => {
  const { isDark, colors: themeColors } = useTheme();
  const { token, userId } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getNotifications();
      console.log('API Response:', response);
      
      // API response formatını kontrol et
      let notificationsData = [];
      if (response && response.success && response.data && Array.isArray(response.data.notifications)) {
        notificationsData = response.data.notifications;
      } else if (response && response.success && Array.isArray(response.data)) {
        notificationsData = response.data;
      } else if (Array.isArray(response)) {
        // Eğer response direkt array ise
        notificationsData = response;
      } else {
        console.log('Beklenmeyen API response formatı:', response);
        notificationsData = [];
      }
      
      setNotifications(notificationsData);
      
      const unread = notificationsData.filter((n: Notification) => !n.read && !n.isRead).length;
      setUnreadCount(unread);
    } catch (err: any) {
      console.error('Bildirimler yüklenirken hata:', err);
      setError('Bildirimler yüklenemedi');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const markAsRead = async (notificationId: string) => {
    try {
      setIsMarkingAsRead(notificationId);
      const response = await apiService.markNotificationAsRead(notificationId);
      
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => 
            n._id === notificationId ? { ...n, read: true, isRead: true } : n
          )
        );
        
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        Alert.alert('Hata', response.message || 'Bildirim güncellenemedi');
      }
    } catch (error) {
      console.error('Bildirim okundu olarak işaretlenemedi:', error);
      Alert.alert('Hata', 'Bildirim güncellenemedi');
    } finally {
      setIsMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('Tüm bildirimler okundu işaretleniyor');
      const response = await apiService.markAllNotificationsAsRead();
      console.log('Mark all as read response:', response);
      
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
        setUnreadCount(0);
        console.log('Tüm bildirimler başarıyla okundu işaretlendi');
      } else {
        console.error('Mark all as read failed:', response.message);
        Alert.alert('Hata', response.message || 'Bildirimler güncellenemedi');
      }
    } catch (error) {
      console.error('Tüm bildirimler okundu olarak işaretlenemedi:', error);
      Alert.alert('Hata', 'Bildirimler güncellenemedi');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      console.log('Bildirim siliniyor:', notificationId);
      const response = await apiService.deleteNotification(notificationId);
      console.log('Delete notification response:', response);
      
      if (response.success) {
        setNotifications(prev => {
          const deletedNotification = prev.find(n => n._id === notificationId);
          if (deletedNotification && (!deletedNotification.read || !deletedNotification.isRead)) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
          return prev.filter(n => n._id !== notificationId);
        });
        console.log('Bildirim başarıyla silindi');
      } else {
        console.error('Delete notification failed:', response.message);
        Alert.alert('Hata', response.message || 'Bildirim silinemedi');
      }
    } catch (error) {
      console.error('Bildirim silinemedi:', error);
      Alert.alert('Hata', 'Bildirim silinemedi');
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read && !notification.isRead) {
      markAsRead(notification._id);
    }
    
    // Bildirim detayını göster
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedNotification(null);
  };

  const handleDetailAction = (notification: Notification) => {
    setShowDetailModal(false);
    setSelectedNotification(null);
    
    // Bildirim türüne göre yönlendirme
    switch (notification.type) {
      case 'appointment_confirmed':
      case 'appointment_request':
        navigation.navigate('Appointments');
        break;
      case 'payment':
        navigation.navigate('Wallet');
        break;
      case 'service':
        navigation.navigate('Garage');
        break;
      case 'reminder':
        navigation.navigate('Appointments');
        break;
      case 'system':
        // Sistem bildirimleri için yönlendirme yok
        break;
      default:
        break;
    }
  };

  const handleDeletePress = (notification: Notification) => {
    Alert.alert(
      'Bildirimi Sil',
      'Bu bildirimi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => deleteNotification(notification._id)
        }
      ]
    );
  };


  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    // Filter by read status
    switch (selectedFilter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read && !n.isRead);
        break;
      case 'read':
        filtered = filtered.filter(n => n.read || n.isRead);
        break;
      default:
        break;
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getNotificationTypeLabel(n.type).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getNotificationStats = () => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read && !n.isRead).length;
    const read = total - unread;
    return { total, unread, read };
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#34C759';
      default:
        return '#007AFF';
    }
  };


  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.read && !item.isRead;
    const isMarking = isMarkingAsRead === item._id;
    const priority = getNotificationPriority(item.type);
    const priorityColor = getPriorityColor(priority);
    const category = getNotificationCategory(item.type);
    
    return (
      <View style={[
        styles.notificationItem,
        { 
          backgroundColor: isDark ? themeColors.background.primary : '#FFFFFF',
          borderLeftColor: isUnread ? priorityColor : 'transparent',
        },
        isUnread && styles.unreadNotification
      ]}>
        <TouchableOpacity
          style={styles.notificationContent}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.6}
        >
          <View style={styles.notificationLeft}>
            <View style={[
              styles.notificationIcon,
              { 
                backgroundColor: isUnread ? priorityColor : (isDark ? themeColors.background.tertiary : '#F5F5F5')
              }
            ]}>
              <MaterialCommunityIcons
                name={getNotificationIcon(item.type) as any}
                size={20}
                color={isUnread ? 'white' : priorityColor}
              />
            </View>
            
            <View style={styles.notificationTextContainer}>
              <View style={styles.notificationHeader}>
                <View style={styles.notificationTitleContainer}>
                  <Text style={[
                    styles.notificationTitle,
                    { 
                      color: themeColors.text.primary,
                      fontWeight: isUnread ? '600' : '500'
                    }
                  ]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[
                    styles.categoryText,
                    { color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary }
                  ]}>
                    {category}
                  </Text>
                </View>
                <Text style={[
                  styles.notificationTime,
                  { color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary }
                ]}>
                  {formatNotificationTime(item.createdAt)}
                </Text>
              </View>
              
              <Text style={[
                styles.notificationMessage,
                { 
                  color: isDark ? themeColors.text.tertiary : themeColors.text.secondary,
                  fontWeight: isUnread ? '500' : '400'
                }
              ]} numberOfLines={2}>
                {item.message}
              </Text>
            </View>
          </View>
          
          <View style={styles.notificationRight}>
            {isUnread && (
              <View style={[styles.unreadDot, { backgroundColor: priorityColor }]} />
            )}
            {isMarking && (
              <View style={styles.loadingIndicator}>
                <MaterialCommunityIcons 
                  name="loading" 
                  size={16} 
                  color={themeColors.primary.main} 
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePress(item)}
        >
          <MaterialCommunityIcons 
            name="delete-outline" 
            size={18} 
            color={isDark ? themeColors.text.quaternary : themeColors.text.tertiary} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Background>
          <LoadingSkeleton />
        </Background>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Background>
          <ErrorState 
            message={error}
            onRetry={fetchNotifications}
          />
        </Background>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent 
      />
      <Background>
        <View style={styles.container}>
          {/* Header */}
          <View style={[
            styles.header,
            { 
              backgroundColor: isDark ? themeColors.background.primary : '#FFFFFF',
              borderBottomColor: isDark ? themeColors.border.tertiary : '#E5E5E5',
            }
          ]}>
            <View style={styles.headerTop}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons 
                  name="arrow-back" 
                  size={24} 
                  color={themeColors.text.primary} 
                />
              </TouchableOpacity>
              
              <View style={styles.headerTitleContainer}>
                <Text style={[
                  styles.headerTitle,
                  { color: themeColors.text.primary }
                ]}>
                  Bildirimler
                </Text>
                {unreadCount > 0 && (
                  <View style={[styles.headerBadge, { backgroundColor: themeColors.primary.main }]}>
                    <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.filterButton}
                  onPress={() => setShowFilters(!showFilters)}
                >
                  <MaterialCommunityIcons 
                    name="filter-variant" 
                    size={20} 
                    color={themeColors.text.primary} 
                  />
                </TouchableOpacity>
                
                {unreadCount > 0 && (
                  <TouchableOpacity 
                    style={styles.markAllButton}
                    onPress={markAllAsRead}
                  >
                    <MaterialCommunityIcons 
                      name="check-all" 
                      size={16} 
                      color={themeColors.primary.main} 
                    />
                    <Text style={[
                      styles.markAllButtonText,
                      { color: themeColors.primary.main }
                    ]}>
                      Tümünü Okundu İşaretle
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <Text style={[
              styles.headerSubtitle,
              { color: isDark ? themeColors.text.tertiary : themeColors.text.secondary }
            ]}>
              {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
            </Text>

            {/* Search Bar */}
            <View style={[
              styles.searchContainer,
              { backgroundColor: isDark ? themeColors.background.tertiary : '#F8F9FA' }
            ]}>
              <MaterialCommunityIcons 
                name="magnify" 
                size={20} 
                color={isDark ? themeColors.text.quaternary : themeColors.text.tertiary} 
              />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: themeColors.text.primary }
                ]}
                placeholder="Bildirimlerde ara..."
                placeholderTextColor={isDark ? themeColors.text.quaternary : themeColors.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <MaterialCommunityIcons 
                    name="close-circle" 
                    size={20} 
                    color={isDark ? themeColors.text.quaternary : themeColors.text.tertiary} 
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Tabs */}
            {showFilters && (
              <View style={styles.filterTabs}>
                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    selectedFilter === 'all' && styles.activeFilterTab,
                    { backgroundColor: selectedFilter === 'all' ? themeColors.primary.main : 'transparent' }
                  ]}
                  onPress={() => setSelectedFilter('all')}
                >
                  <Text style={[
                    styles.filterTabText,
                    { color: selectedFilter === 'all' ? 'white' : themeColors.text.primary }
                  ]}>
                    Tümü ({getNotificationStats().total})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    selectedFilter === 'unread' && styles.activeFilterTab,
                    { backgroundColor: selectedFilter === 'unread' ? '#FF3B30' : 'transparent' }
                  ]}
                  onPress={() => setSelectedFilter('unread')}
                >
                  <Text style={[
                    styles.filterTabText,
                    { color: selectedFilter === 'unread' ? 'white' : themeColors.text.primary }
                  ]}>
                    Okunmamış ({getNotificationStats().unread})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    selectedFilter === 'read' && styles.activeFilterTab,
                    { backgroundColor: selectedFilter === 'read' ? '#34C759' : 'transparent' }
                  ]}
                  onPress={() => setSelectedFilter('read')}
                >
                  <Text style={[
                    styles.filterTabText,
                    { color: selectedFilter === 'read' ? 'white' : themeColors.text.primary }
                  ]}>
                    Okundu ({getNotificationStats().read})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Notifications List */}
          {getFilteredNotifications().length > 0 ? (
            <FlatList
              data={getFilteredNotifications()}
              renderItem={renderNotificationItem}
              keyExtractor={(item) => item._id}
              style={styles.notificationsList}
              contentContainerStyle={styles.notificationsContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  colors={[themeColors.primary.main]}
                  tintColor={themeColors.primary.main}
                />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="bell-off" 
                size={64} 
                color={isDark ? themeColors.text.quaternary : themeColors.text.tertiary} 
              />
              <Text style={[
                styles.emptyTitle,
                { color: themeColors.text.primary }
              ]}>
                Henüz Bildirim Yok
              </Text>
              <Text style={[
                styles.emptySubtitle,
                { color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary }
              ]}>
                Yeni bildirimler geldiğinde burada görünecek
              </Text>
              <TouchableOpacity 
                style={[styles.refreshButton, { backgroundColor: themeColors.primary.main }]}
                onPress={onRefresh}
              >
                <MaterialCommunityIcons name="refresh" size={20} color="white" />
                <Text style={styles.refreshButtonText}>Yenile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bildirim Detay Modalı */}
        <Modal
          visible={showDetailModal}
          animationType="slide"
          transparent={true}
          onRequestClose={handleDetailModalClose}
        >
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContainer,
              { 
                backgroundColor: isDark ? themeColors.background.primary : '#FFFFFF',
              }
            ]}>
              {selectedNotification && (
                <>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderLeft}>
                      <View style={[
                        styles.modalIcon,
                        { backgroundColor: getNotificationColor(selectedNotification.type) }
                      ]}>
                        <MaterialCommunityIcons
                          name={getNotificationIcon(selectedNotification.type) as any}
                          size={20}
                          color="white"
                        />
                      </View>
                      <View style={styles.modalHeaderText}>
                        <Text style={[
                          styles.modalTitle,
                          { color: themeColors.text.primary }
                        ]}>
                          {selectedNotification.title}
                        </Text>
                        <Text style={[
                          styles.modalTime,
                          { color: isDark ? themeColors.text.tertiary : themeColors.text.secondary }
                        ]}>
                          {formatNotificationTime(selectedNotification.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={handleDetailModalClose}
                    >
                      <Ionicons 
                        name="close" 
                        size={24} 
                        color={themeColors.text.primary} 
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Modal Content */}
                  <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    <Text style={[
                      styles.modalMessage,
                      { color: themeColors.text.primary }
                    ]}>
                      {selectedNotification.message}
                    </Text>

                    {/* Bildirim Türü */}
                    <View style={styles.modalTypeContainer}>
                      <Text style={[
                        styles.modalTypeLabel,
                        { color: isDark ? themeColors.text.tertiary : themeColors.text.secondary }
                      ]}>
                        Bildirim Türü
                      </Text>
                      <View style={[
                        styles.modalTypeBadge,
                        { backgroundColor: getNotificationColor(selectedNotification.type) + '20' }
                      ]}>
                        <Text style={[
                          styles.modalTypeText,
                          { color: getNotificationColor(selectedNotification.type) }
                        ]}>
                          {getNotificationTypeLabel(selectedNotification.type)}
                        </Text>
                      </View>
                    </View>

                    {/* Tarih */}
                    <View style={styles.modalDateContainer}>
                      <Text style={[
                        styles.modalDateLabel,
                        { color: isDark ? themeColors.text.tertiary : themeColors.text.secondary }
                      ]}>
                        Tarih
                      </Text>
                      <Text style={[
                        styles.modalDateText,
                        { color: themeColors.text.primary }
                      ]}>
                        {new Date(selectedNotification.createdAt).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </ScrollView>

                  {/* Modal Actions */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[
                        styles.modalActionButton,
                        styles.modalSecondaryButton,
                        { borderColor: isDark ? themeColors.border.tertiary : '#E5E5E5' }
                      ]}
                      onPress={handleDetailModalClose}
                    >
                      <Text style={[
                        styles.modalSecondaryButtonText,
                        { color: themeColors.text.primary }
                      ]}>
                        Kapat
                      </Text>
                    </TouchableOpacity>
                    
                    {shouldShowActionButton(selectedNotification.type) && (
                      <TouchableOpacity
                        style={[
                          styles.modalActionButton,
                          styles.modalPrimaryButton,
                          { backgroundColor: themeColors.primary.main }
                        ]}
                        onPress={() => handleDetailAction(selectedNotification)}
                      >
                        <Text style={styles.modalPrimaryButtonText}>
                          {getActionButtonText(selectedNotification.type)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </Background>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  // Header Styles
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: '700',
  },
  headerBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  headerBadgeText: {
    color: 'white',
    fontSize: typography.fontSizes.xs,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
  },
  markAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  markAllButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterButton: {
    padding: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: spacing.xs,
  },
  filterTabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterTab: {
    borderColor: 'transparent',
  },
  filterTabText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
  },
  // Notification List Styles
  notificationsList: {
    flex: 1,
  },
  notificationsContainer: {
    paddingBottom: spacing.lg,
  },
  notificationItem: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: 'rgba(0, 122, 255, 0.02)',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  notificationLeft: {
    flex: 1,
    flexDirection: 'row',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    fontSize: typography.fontSizes.md,
    flex: 1,
    marginRight: spacing.sm,
  },
  notificationTitleContainer: {
    flex: 1,
  },
  categoryText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  notificationTime: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
  },
  notificationRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  modalTime: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalContent: {
    padding: spacing.lg,
    maxHeight: 400,
  },
  modalMessage: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  modalTypeContainer: {
    marginBottom: spacing.lg,
  },
  modalTypeLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  modalTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  modalTypeText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
  },
  modalDateContainer: {
    marginBottom: spacing.lg,
  },
  modalDateLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  modalDateText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: spacing.md,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryButton: {
    borderWidth: 1,
  },
  modalPrimaryButton: {
    // backgroundColor will be set dynamically
  },
  modalSecondaryButtonText: {
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
  },
});

export default NotificationsScreen; 