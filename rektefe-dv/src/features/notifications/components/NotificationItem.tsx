import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { Notification } from '@/shared/types/common';

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
}) => {
  const { theme } = useTheme();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'calendar-clock';
      case 'rating':
        return 'star';
      case 'system':
        return 'information';
      case 'payment':
        return 'credit-card';
      case 'emergency':
        return 'alert';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return '#3B82F6';
      case 'rating':
        return '#F59E0B';
      case 'system':
        return '#6B7280';
      case 'payment':
        return '#10B981';
      case 'emergency':
        return '#EF4444';
      default:
        return theme.colors.text.secondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}dk önce`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}sa önce`;
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.card },
        !notification.isRead && styles.unreadContainer
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!notification.isRead && (
        <View style={[styles.unreadIndicator, { backgroundColor: theme.colors.primary.main }]} />
      )}
      
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(notification.type) + '20' }]}>
        <MaterialCommunityIcons
          name={getNotificationIcon(notification.type)}
          size={24}
          color={getNotificationColor(notification.type)}
        />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={[styles.message, { color: theme.colors.text.secondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={[styles.date, { color: theme.colors.text.secondary }]}>
          {formatDate(notification.createdAt)}
        </Text>
      </View>
      
      <View style={styles.actions}>
        {!notification.isRead && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
          >
            <MaterialCommunityIcons
              name="check"
              size={20}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={20}
            color={theme.colors.text.secondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unreadContainer: {
    elevation: 3,
    shadowOpacity: 0.15,
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  date: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
});
