import React from 'react';
import { View, StyleSheet, FlatList, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from '../components/NotificationItem';
import { BackButton } from '@/shared/components';

const NotificationsScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const {
    notifications,
    loading,
    refreshing,
    markAsRead,
    deleteNotification,
    onRefresh,
    filter,
    setFilter,
    unreadCount,
  } = useNotifications();

  console.log('🔍 NotificationsScreen: notifications:', notifications);
  console.log('🔍 NotificationsScreen: loading:', loading);
  console.log('🔍 NotificationsScreen: refreshing:', refreshing);

  const handleNotificationPress = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    // Navigation logic buraya eklenebilir
  };

  const renderNotificationItem = ({ item }: { item: any }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      onMarkAsRead={() => markAsRead(item._id)}
      onDelete={() => deleteNotification(item._id)}
    />
  );

  // notifications undefined kontrolü
  const safeNotifications = notifications || [];

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyContent}>
        {/* Icon Container */}
        <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.primary.main + '15' }]}>
          <MaterialCommunityIcons 
            name="bell-outline" 
            size={64} 
            color={theme.colors.primary.main} 
          />
        </View>
        
        {/* Title */}
        <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
          Henüz bildirim yok
        </Text>
        
        {/* Subtitle */}
        <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
          Yeni bildirimler burada görünecek
        </Text>
        
        {/* Description */}
        <Text style={[styles.emptyDescription, { color: theme.colors.text.secondary }]}>
          Randevu hatırlatmaları, ödeme bildirimleri ve sistem mesajları burada yer alacak.
        </Text>
        
        {/* Action Button */}
        <TouchableOpacity 
          style={[styles.emptyActionButton, { backgroundColor: theme.colors.primary.main }]}
          onPress={onRefresh}
        >
          <MaterialCommunityIcons name="refresh" size={20} color="white" />
          <Text style={styles.emptyActionText}>Yenile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Bildirimler yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.headerContent}>
          <BackButton />
          
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Bildirimler
          </Text>
          
          {unreadCount > 0 ? (
            <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary.main }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
        
        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {[
            { key: 'all', label: 'Tümü', icon: 'bell-outline' },
            { key: 'unread', label: 'Okunmamış', icon: 'bell-ring-outline' },
            { key: 'appointment', label: 'Randevular', icon: 'calendar-clock' },
            { key: 'system', label: 'Sistem', icon: 'information-outline' },
          ].map((filterOption) => (
            <TouchableOpacity
              key={filterOption.key}
              style={[
                styles.filterButton,
                { 
                  backgroundColor: filter === filterOption.key 
                    ? theme.colors.primary.main 
                    : theme.colors.background.card,
                  borderColor: theme.colors.border.primary
                }
              ]}
              onPress={() => setFilter(filterOption.key as any)}
            >
              <MaterialCommunityIcons 
                name={filterOption.icon as any} 
                size={16} 
                color={filter === filterOption.key ? 'white' : theme.colors.text.secondary} 
              />
              <Text style={[
                styles.filterButtonText,
                { color: filter === filterOption.key ? 'white' : theme.colors.text.secondary }
              ]}>
                {filterOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={safeNotifications}
        keyExtractor={(item) => item._id}
        renderItem={renderNotificationItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default NotificationsScreen;