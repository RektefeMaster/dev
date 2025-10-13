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
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/shared/context';
import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import apiService from '@/shared/services';
import { BackButton } from '@/shared/components';
import { getServiceCategory, getNotificationTypeText } from '@/shared/utils/serviceTypeHelpers';

const { width } = Dimensions.get('window');

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
  const iconMap: { [key: string]: string } = {
    appointment: 'calendar',
    payment: 'card',
    message: 'chatbubble',
    system: 'settings',
    emergency: 'warning',
    promotion: 'gift',
    reminder: 'time',
    update: 'refresh',
    security: 'shield',
    maintenance: 'construct',
    fault_report: 'alert-circle', // Arıza bildirimi ikonu
    towing_request: 'car', // Çekici talebi ikonu
    default: 'notifications'
  };
  
  return iconMap[type] || iconMap.default;
};

const getNotificationColor = (type: string): string => {
  const colorMap: { [key: string]: string } = {
    appointment: '#3B82F6',
    payment: '#10B981',
    message: '#8B5CF6',
    system: '#6B7280',
    emergency: '#EF4444',
    promotion: '#F59E0B',
    reminder: '#06B6D4',
    update: '#6366F1',
    security: '#84CC16',
    maintenance: '#F97316',
    fault_report: '#F97316', // Arıza bildirimi - Turuncu
    towing_request: '#EF4444', // Çekici talebi - Kırmızı
    default: '#64748B'
  };
  
  return colorMap[type] || colorMap.default;
};

const getNotificationCategory = (type: string, serviceCategories?: string[]): string => {
  const serviceCategory = getServiceCategory(serviceCategories);
  
  // Hizmet türüne göre özelleştirilmiş kategoriler
  if (type === 'appointment') {
    return getNotificationTypeText(serviceCategory, 'appointment');
  }
  if (type === 'fault_report') {
    return getNotificationTypeText(serviceCategory, 'fault_report');
  }
  
  // Genel kategoriler
  const categoryMap: { [key: string]: string } = {
    payment: 'Ödeme',
    message: 'Mesaj',
    system: 'Sistem',
    emergency: 'Acil',
    promotion: 'Promosyon',
    reminder: 'Hatırlatma',
    update: 'Güncelleme',
    security: 'Güvenlik',
    maintenance: 'Bakım',
    fault_report: 'Arıza Bildirimi',
    towing_request: 'Çekici Talebi',
    default: 'Genel'
  };

  return categoryMap[type] || 'Diğer';
};

const formatNotificationTime = (createdAt: string): string => {
  const now = new Date();
  const notificationDate = new Date(createdAt);
  const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Şimdi';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} dk önce`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} saat önce`;
  } else {
    return notificationDate.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

export default function NotificationsScreen({ navigation }: any) {
  const { user, isAuthenticated } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      if (!isAuthenticated) {
        console.log('❌ Not authenticated, skipping notifications fetch');
        setNotifications([]);
        setLoading(false);
        return;
      }

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
      // Cancel edilen istekleri handle et (error logging yapma)
      if (error?.name === 'CanceledError' || error?.message?.includes('No authentication token')) {
        // Silent cancellation - no logging
        setNotifications([]);
        setLoading(false);
        return;
      }
      
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
      const unreadNotifications = notifications.filter(n => !n.read && !n.isRead);
      
      for (const notification of unreadNotifications) {
        await apiService.markNotificationAsRead(notification._id);
      }
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, isRead: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      Alert.alert('Hata', 'Bildirimler güncellenemedi');
    }
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    // Filtreleme
    if (selectedFilter === 'unread') {
      filtered = filtered.filter(n => !n.read && !n.isRead);
    } else if (selectedFilter === 'read') {
      filtered = filtered.filter(n => n.read || n.isRead);
    }
    
    // Arama
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        getNotificationCategory(n.type, user?.serviceCategories).toLowerCase().includes(query)
      );
    }
    
    // Tarihe göre sıralama (en yeni önce)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const handleNotificationPress = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    
    // Okunmamışsa okundu olarak işaretle
    if (!notification.read && !notification.isRead) {
      markAsRead(notification._id);
    }
  };

  const renderFilterButton = (filter: 'all' | 'unread' | 'read', label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[
          styles.filterBadge,
          selectedFilter === filter && styles.filterBadgeActive
        ]}>
          <Text style={[
            styles.filterBadgeText,
            selectedFilter === filter && styles.filterBadgeTextActive
          ]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.read && !item.isRead;
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationColor(item.type);
    const category = getNotificationCategory(item.type, user?.serviceCategories);
    const timeText = formatNotificationTime(item.createdAt);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isUnread && styles.notificationCardUnread
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <View style={[styles.notificationIcon, { backgroundColor: iconColor + '20' }]}>
              <Ionicons name={iconName as any} size={20} color={iconColor} />
            </View>
            <View style={styles.notificationInfo}>
              <View style={styles.notificationTitleRow}>
                <Text style={[
                  styles.notificationTitle,
                  isUnread && styles.notificationTitleUnread
                ]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.notificationTime}>{timeText}</Text>
              </View>
              <Text style={styles.notificationCategory}>{category}</Text>
            </View>
            {isUnread && (
              <View style={styles.unreadIndicator} />
            )}
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          
          {isMarkingAsRead === item._id && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons 
          name="notifications-outline" 
          size={64} 
          color="#D1D5DB" 
        />
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz bildirim yok'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Farklı anahtar kelimeler deneyin' 
          : 'Yeni bildirimler geldiğinde burada görünecek'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchNotifications}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.refreshButtonText}>Yenile</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.headerTop}>
            <BackButton 
              color={colors.text.primary}
              onPress={() => navigation.goBack()}
            />
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Bildirimler</Text>
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity 
                style={styles.markAllButton}
                onPress={markAllAsRead}
              >
                <Ionicons name="checkmark" size={20} color={colors.primary.main} />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Bildirimlerde ara..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {renderFilterButton('all', 'Tümü', notifications.length)}
          {renderFilterButton('unread', 'Okunmamış', unreadCount)}
          {renderFilterButton('read', 'Okunmuş', notifications.length - unreadCount)}
        </ScrollView>
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
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
        />
      ) : (
        renderEmptyState()
      )}

      {/* Notification Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Ionicons name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Bildirim Detayı</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          
          {selectedNotification && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalNotificationCard}>
                <View style={styles.modalNotificationHeader}>
                  <View style={[
                    styles.modalNotificationIcon, 
                    { backgroundColor: getNotificationColor(selectedNotification.type) + '20' }
                  ]}>
                    <Ionicons 
                      name={getNotificationIcon(selectedNotification.type) as any} 
                      size={24} 
                      color={getNotificationColor(selectedNotification.type)} 
                    />
                  </View>
                  <View style={styles.modalNotificationInfo}>
                    <Text style={styles.modalNotificationTitle}>
                      {selectedNotification.title}
                    </Text>
                    <Text style={styles.modalNotificationCategory}>
                      {getNotificationCategory(selectedNotification.type, user?.serviceCategories)}
                    </Text>
                    <Text style={styles.modalNotificationTime}>
                      {formatNotificationTime(selectedNotification.createdAt)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.modalNotificationMessage}>
                  {selectedNotification.message}
                </Text>
                
                {selectedNotification.data && (
                  <View style={styles.modalNotificationData}>
                    <Text style={styles.modalNotificationDataTitle}>Ek Bilgiler:</Text>
                    <Text style={styles.modalNotificationDataContent}>
                      {JSON.stringify(selectedNotification.data, null, 2)}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'System',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.background.primary,
  },
  headerContent: {
    paddingHorizontal: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'System',
  },
  markAllButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  markAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.main,
    fontFamily: 'System',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'System',
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: 'System',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  filterBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'System',
  },
  filterBadgeTextActive: {
    color: '#3B82F6',
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContainer: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    ...shadows.small,
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  notificationContent: {
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
    fontFamily: 'System',
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  notificationTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'System',
  },
  notificationCategory: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'System',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontFamily: 'System',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginTop: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: 'System',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    fontFamily: 'System',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'System',
  },
  modalPlaceholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalNotificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...shadows.medium,
  },
  modalNotificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalNotificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalNotificationInfo: {
    flex: 1,
  },
  modalNotificationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: 'System',
  },
  modalNotificationCategory: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: 'System',
  },
  modalNotificationTime: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: 'System',
  },
  modalNotificationMessage: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
    fontFamily: 'System',
  },
  modalNotificationData: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  modalNotificationDataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    fontFamily: 'System',
  },
  modalNotificationDataContent: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
  },
});