import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from '../components/NotificationItem';

const NotificationsScreen = () => {
  const { theme } = useTheme();
  
  const {
    notifications,
    loading,
    refreshing,
    markAsRead,
    deleteNotification,
    onRefresh,
  } = useNotifications();

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderNotificationItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 16,
  },
});

export default NotificationsScreen;