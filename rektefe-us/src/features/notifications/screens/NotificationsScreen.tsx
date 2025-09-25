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
import { useAuth } from '@/shared/context';
import { useTheme } from '@/shared/context';
import { colors, typography, spacing, borderRadius } from '@/shared/theme';
import apiService from '@/shared/services';

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

const getNotificationIcon = (type: string): string => {
  switch (type) {
    case 'appointment_request':
      return 'calendar-clock';
    case 'appointment_confirmed':
      return 'calendar-check';
    case 'appointment_cancelled':
      return 'calendar-remove';
    case 'payment_received':
      return 'cash-multiple';
    case 'payment_pending':
      return 'clock-outline';
    case 'rating_received':
      return 'star';
    case 'new_message':
      return 'message-text';
    case 'job_completed':
      return 'check-circle';
    case 'job_assigned':
      return 'briefcase';
    case 'reminder':
      return 'alarm';
    case 'system':
      return 'cog';
    case 'promotion':
      return 'gift';
    case 'update':
      return 'update';
    case 'fault_report':
      return 'alert-circle';
    case 'towing_request':
      return 'truck';
    case 'wash_request':
      return 'car-wash';
    case 'tire_service':
      return 'tire';
    case 'garage_service':
      return 'garage';
    case 'wallet':
      return 'wallet';
    case 'points':
      return 'star-circle';
    default:
      return 'bell';
  }
};

const getNotificationColor = (type: string): string => {
  switch (type) {
    case 'appointment_request':
      return '#007AFF';
    case 'appointment_confirmed':
      return '#34C759';
    case 'appointment_cancelled':
      return '#FF3B30';
    case 'payment_received':
      return '#34C759';
    case 'payment_pending':
      return '#FF9500';
    case 'rating_received':
      return '#FFD700';
    case 'new_message':
      return '#007AFF';
    case 'job_completed':
      return '#34C759';
    case 'job_assigned':
      return '#007AFF';
    case 'reminder':
      return '#FF9500';
    case 'system':
      return '#8E8E93';
    case 'promotion':
      return '#FF2D92';
    case 'update':
      return '#007AFF';
    case 'fault_report':
      return '#FF3B30';
    case 'towing_request':
      return '#FF9500';
    case 'wash_request':
      return '#007AFF';
    case 'tire_service':
      return '#8E8E93';
    case 'garage_service':
      return '#34C759';
    case 'wallet':
      return '#34C759';
    case 'points':
      return '#FFD700';
    default:
      return '#007AFF';
  }
};

const getNotificationTypeLabel = (type: string): string => {
  switch (type) {
    case 'appointment_request':
      return 'Randevu Talebi';
    case 'appointment_confirmed':
      return 'Randevu Onaylandı';
    case 'appointment_cancelled':
      return 'Randevu İptal Edildi';
    case 'payment_received':
      return 'Ödeme Alındı';
    case 'payment_pending':
      return 'Ödeme Bekleniyor';
    case 'rating_received':
      return 'Değerlendirme Alındı';
    case 'new_message':
      return 'Yeni Mesaj';
    case 'job_completed':
      return 'İş Tamamlandı';
    case 'job_assigned':
      return 'İş Atandı';
    case 'reminder':
      return 'Hatırlatma';
    case 'system':
      return 'Sistem Bildirimi';
    case 'promotion':
      return 'Promosyon';
    case 'update':
      return 'Güncelleme';
    case 'fault_report':
      return 'Arıza Bildirimi';
    case 'towing_request':
      return 'Çekici Talebi';
    case 'wash_request':
      return 'Yıkama Talebi';
    case 'tire_service':
      return 'Lastik Hizmeti';
    case 'garage_service':
      return 'Garaj Hizmeti';
    case 'wallet':
      return 'Cüzdan';
    case 'points':
      return 'Puan';
    default:
      return 'Bildirim';
  }
};

const shouldShowActionButton = (type: string): boolean => {
  return ['appointment_request', 'appointment_confirmed', 'new_message', 'job_assigned', 'fault_report'].includes(type);
};

const getActionButtonText = (type: string): string => {
  switch (type) {
    case 'appointment_request':
    case 'appointment_confirmed':
      return 'Randevuları Görüntüle';
    case 'new_message':
      return 'Mesajları Aç';
    case 'job_assigned':
      return 'İşleri Görüntüle';
    case 'fault_report':
      return 'Arıza Raporlarını Görüntüle';
    default:
      return 'Detayları Görüntüle';
  }
};

const getNotificationPriority = (type: string): 'high' | 'medium' | 'low' => {
  const priorityMap: { [key: string]: 'high' | 'medium' | 'low' } = {
    'appointment_request': 'high',
    'payment_received': 'high',
    'job_assigned': 'high',
    'fault_report': 'high',
    'appointment_confirmed': 'medium',
    'appointment_cancelled': 'medium',
    'payment_pending': 'medium',
    'new_message': 'medium',
    'job_completed': 'medium',
    'rating_received': 'low',
    'promotion': 'low',
    'update': 'low',
    'system': 'low',
    'reminder': 'low'
  };
  return priorityMap[type] || 'medium';
};

const getNotificationCategory = (type: string): string => {
  const categoryMap: { [key: string]: string } = {
    'appointment_request': 'Randevular',
    'appointment_confirmed': 'Randevular',
    'appointment_cancelled': 'Randevular',
    'payment_received': 'Ödemeler',
    'payment_pending': 'Ödemeler',
    'rating_received': 'Değerlendirmeler',
    'new_message': 'Mesajlar',
    'job_completed': 'İşler',
    'job_assigned': 'İşler',
    'reminder': 'Hatırlatmalar',
    'system': 'Sistem',
    'promotion': 'Promosyonlar',
    'update': 'Güncellemeler',
    'fault_report': 'Arıza Raporları',
    'towing_request': 'Çekici Hizmetleri',
    'wash_request': 'Yıkama Hizmetleri',
    'tire_service': 'Lastik Hizmetleri',
    'garage_service': 'Garaj Hizmetleri',
    'wallet': 'Cüzdan',
    'points': 'Puanlar',
    'general': 'Genel'
  };
  return categoryMap[type] || 'Diğer';
};

const NotificationsScreen = ({ navigation }: any) => {
  const { isDark, themeColors } = useTheme();
  const { token, userId } = useAuth();
  
  // Güvenli renk erişimi için fallback
  const safeColors = {
    primary: themeColors?.primary?.main || '#4B6382',
    text: {
      primary: themeColors?.text?.primary || (isDark ? '#FFFFFF' : '#11181C'),
      secondary: themeColors?.text?.secondary || (isDark ? '#A4B5C4' : '#687076'),
      tertiary: themeColors?.text?.tertiary || (isDark ? '#848A92' : '#9BA1A6'),
      quaternary: themeColors?.text?.quaternary || (isDark ? '#636970' : '#C7C7CC'),
    },
    background: {
      primary: themeColors?.background?.primary || (isDark ? '#0E2235' : '#FFFFFF'),
      secondary: themeColors?.background?.secondary || (isDark ? '#184567' : '#F2F2F7'),
      tertiary: themeColors?.background?.tertiary || (isDark ? '#24252B' : '#E5E5EA'),
    },
    border: {
      tertiary: themeColors?.border?.tertiary || (isDark ? '#A4B5C4' : '#8E8E93'),
    }
  };
  
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
      let notificationsData = [];
      if (response.data && (response.data as any).notifications) {
        notificationsData = (response.data as any).notifications;
      } else if (Array.isArray(response.data)) {
        notificationsData = response.data;
      } else if (Array.isArray(response)) {
        notificationsData = response;
      }
      
      setNotifications(notificationsData);
      
      const unread = notificationsData.filter((n: Notification) => !n.read && !n.isRead).length;
      setUnreadCount(unread);
      
    } catch (error) {
      setError('Bildirimler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

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
      Alert.alert('Hata', 'Bildirim güncellenemedi');
    } finally {
      setIsMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiService.markAllNotificationsAsRead();
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true, isRead: true }))
        );
        setUnreadCount(0);
        } else {
        Alert.alert('Hata', response.message || 'Bildirimler güncellenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bildirimler güncellenemedi');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await apiService.deleteNotification(notificationId);
      if (response.success) {
        const deletedNotification = notifications.find(n => n._id === notificationId);
        if (deletedNotification && (!deletedNotification.read || !deletedNotification.isRead)) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        } else {
        Alert.alert('Hata', response.message || 'Bildirim silinemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bildirim silinemedi');
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read && !notification.isRead) {
      markAsRead(notification._id);
    }
    
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
    
    switch (notification.type) {
      case 'appointment_request':
      case 'appointment_confirmed':
        navigation.navigate('Appointments');
        break;
      case 'new_message':
        navigation.navigate('Messages');
        break;
      case 'job_assigned':
        navigation.navigate('Home');
        break;
      case 'fault_report':
        navigation.navigate('FaultReports');
        break;
      case 'payment_received':
      case 'payment_pending':
        navigation.navigate('Wallet');
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

  const formatNotificationTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Şimdi';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} dk önce`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} saat önce`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} gün önce`;
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
          backgroundColor: isDark ? safeColors.background.primary : '#FFFFFF',
          borderLeftColor: isUnread ? priorityColor : 'transparent',
        },
        isUnread && styles.unreadNotification
      ]}>
        <TouchableOpacity
          style={styles.notificationContent}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.notificationLeft}>
            <View style={[
              styles.notificationIcon,
              { 
                backgroundColor: isUnread ? priorityColor : (isDark ? safeColors.background.tertiary : '#F8FAFC')
              }
            ]}>
              <MaterialCommunityIcons
                name={getNotificationIcon(item.type) as any}
                size={22}
                color={isUnread ? 'white' : priorityColor}
              />
            </View>
            
            <View style={styles.notificationTextContainer}>
              <View style={styles.notificationHeader}>
                <View style={styles.notificationTitleContainer}>
                  <Text style={[
                    styles.notificationTitle,
                    { 
                      color: safeColors.text.primary,
                      fontWeight: isUnread ? '700' : '600'
                    }
                  ]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[
                    styles.categoryText,
                    { color: isDark ? safeColors.text.quaternary : safeColors.text.tertiary }
                  ]}>
                    {category}
                  </Text>
                </View>
                <Text style={[
                  styles.notificationTime,
                  { color: isDark ? safeColors.text.quaternary : safeColors.text.tertiary }
                ]}>
                  {formatNotificationTime(item.createdAt)}
                </Text>
              </View>
              
              <Text style={[
                styles.notificationMessage,
                  { 
                    color: isDark ? safeColors.text.tertiary : safeColors.text.secondary,
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
                  size={18} 
                  color={safeColors.primary} 
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePress(item)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="delete-outline" 
            size={20} 
              color={isDark ? safeColors.text.quaternary : safeColors.text.tertiary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.loadingContainer, { backgroundColor: isDark ? safeColors.background.primary : '#FFFFFF' }]}>
          <MaterialCommunityIcons name="loading" size={32} color={safeColors.primary} />
          <Text style={[styles.loadingText, { color: safeColors.text.primary }]}>
            Bildirimler yükleniyor...
          </Text>
        </View>
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
      <View style={styles.container}>
        {/* Enhanced Header */}
        <View style={[
          styles.header,
          { 
            backgroundColor: isDark ? safeColors.background.primary : '#FFFFFF',
            borderBottomColor: isDark ? safeColors.border.tertiary : '#E5E5E5',
          }
        ]}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={safeColors.text.primary} 
              />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={[
                styles.headerTitle,
                { color: safeColors.text.primary }
              ]}>
                Bildirimler
              </Text>
              {unreadCount > 0 && (
                <View style={[
                  styles.headerBadge, 
                  { backgroundColor: safeColors.primary },
                  unreadCount > 9 && styles.headerBadgeWide
                ]}>
                  <Text style={styles.headerBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={() => setShowFilters(!showFilters)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="filter-variant" 
                  size={22} 
                  color={safeColors.text.primary} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={[
            styles.headerSubtitle,
            { color: isDark ? safeColors.text.tertiary : safeColors.text.secondary }
          ]}>
            {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
          </Text>

          {/* Enhanced Search Bar */}
          <View style={[
            styles.searchContainer,
            { backgroundColor: isDark ? safeColors.background.tertiary : '#F8F9FA' }
          ]}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={22} 
              color={isDark ? safeColors.text.quaternary : safeColors.text.tertiary} 
            />
            <TextInput
              style={[
                styles.searchInput,
                { color: safeColors.text.primary }
              ]}
              placeholder="Bildirimlerde ara..."
              placeholderTextColor={isDark ? safeColors.text.quaternary : safeColors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="close-circle" 
                  size={22} 
                  color={isDark ? safeColors.text.quaternary : safeColors.text.tertiary} 
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Mark All as Read Button */}
          {unreadCount > 0 && (
            <View style={styles.markAllContainer}>
              <TouchableOpacity 
                style={styles.markAllButton}
                onPress={markAllAsRead}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="check-all" 
                  size={18} 
                  color={safeColors.primary} 
                />
                <Text style={[
                  styles.markAllButtonText,
                  { color: safeColors.primary }
                ]}>
                  Tümünü Okundu İşaretle ({unreadCount})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Filter Tabs */}
          {showFilters && (
            <View style={styles.filterTabs}>
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedFilter === 'all' && styles.activeFilterTab,
                  { backgroundColor: selectedFilter === 'all' ? safeColors.primary : 'transparent' }
                ]}
                onPress={() => setSelectedFilter('all')}
              >
                <Text style={[
                  styles.filterTabText,
                  { color: selectedFilter === 'all' ? 'white' : safeColors.text.primary }
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
                  { color: selectedFilter === 'unread' ? 'white' : safeColors.text.primary }
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
                  { color: selectedFilter === 'read' ? 'white' : safeColors.text.primary }
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
                colors={[safeColors.primary]}
                tintColor={safeColors.primary}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="bell-off" 
              size={64} 
              color={isDark ? safeColors.text.quaternary : safeColors.text.tertiary} 
            />
            <Text style={[
              styles.emptyTitle,
              { color: safeColors.text.primary }
            ]}>
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz bildirim yok'}
            </Text>
            <Text style={[
              styles.emptySubtitle,
              { color: isDark ? safeColors.text.tertiary : safeColors.text.secondary }
            ]}>
              {searchQuery 
                ? 'Farklı anahtar kelimeler deneyin' 
                : 'Yeni bildirimler geldiğinde burada görünecek'
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity 
                style={[styles.refreshButton, { backgroundColor: safeColors.primary }]}
                onPress={fetchNotifications}
              >
                <MaterialCommunityIcons name="refresh" size={20} color="white" />
                <Text style={styles.refreshButtonText}>Yenile</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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
                backgroundColor: isDark ? safeColors.background.primary : '#FFFFFF',
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
                          { color: safeColors.text.primary }
                        ]}>
                          {selectedNotification.title}
                        </Text>
                        <Text style={[
                          styles.modalTime,
                          { color: isDark ? safeColors.text.tertiary : safeColors.text.secondary }
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
                        color={safeColors.text.primary} 
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Modal Content */}
                  <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    <Text style={[
                      styles.modalMessage,
                      { color: safeColors.text.primary }
                    ]}>
                      {selectedNotification.message}
                    </Text>

                    {/* Bildirim Türü */}
                    <View style={styles.modalTypeContainer}>
                      <Text style={[
                        styles.modalTypeLabel,
                        { color: isDark ? safeColors.text.tertiary : safeColors.text.secondary }
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
                        { color: isDark ? safeColors.text.tertiary : safeColors.text.secondary }
                      ]}>
                        Tarih
                      </Text>
                      <Text style={[
                        styles.modalDateText,
                        { color: safeColors.text.primary }
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
                        { borderColor: isDark ? safeColors.border.tertiary : '#E5E5E5' }
                      ]}
                      onPress={handleDetailModalClose}
                    >
                      <Text style={[
                        styles.modalSecondaryButtonText,
                        { color: safeColors.text.primary }
                      ]}>
                        Kapat
                      </Text>
                    </TouchableOpacity>
                    
                    {shouldShowActionButton(selectedNotification.type) && (
                      <TouchableOpacity
                        style={[
                          styles.modalActionButton,
                          styles.modalPrimaryButton,
                          { backgroundColor: safeColors.primary }
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
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.fontSizes.md,
    fontWeight: '500',
    marginTop: spacing.md,
  },
  // Enhanced Header Styles
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0, // Flexbox overflow için
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: '700',
    flexShrink: 1, // Uzun metinlerde küçül
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
  headerBadgeWide: {
    minWidth: 24,
    paddingHorizontal: spacing.sm,
  },
  headerBadgeText: {
    color: 'white',
    fontSize: typography.fontSizes.xs,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0, // Sabit boyut
  },
  filterButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  markAllContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  markAllButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
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
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
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
  // Enhanced Notification List Styles
  notificationsList: {
    flex: 1,
  },
  notificationsContainer: {
    paddingBottom: spacing.xl,
  },
  notificationItem: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  unreadNotification: {
    backgroundColor: 'rgba(0, 122, 255, 0.03)',
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: spacing.md,
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
  notificationTitleContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: typography.fontSizes.md,
    flex: 1,
    marginRight: spacing.sm,
    lineHeight: 20,
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
    marginLeft: spacing.md,
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
    borderRadius: borderRadius.sm,
  },
  // Enhanced Empty State Styles
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
    lineHeight: 22,
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
  // Enhanced Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    shadowColor: '#000000',
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
