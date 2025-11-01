import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';
import { Notification } from '@/shared/types/common';
import { UserProfile } from './UserProfile';
import { QuickActions } from './QuickActions';
import { base64Decode } from '@/shared/utils/base64';

interface GreetingHeaderProps {
  userName: string;
  favoriteCar: {
    brand: string;
    model: string;
    plateNumber: string;
  } | null;
  userId?: string;
}

export const GreetingHeader: React.FC<GreetingHeaderProps> = ({ userName, favoriteCar, userId: propUserId }) => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const [userId, setUserId] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (propUserId) {
      setUserId(propUserId);
      } else {
      getUserId();
    }
    fetchUnreadCount();
  }, [propUserId]);

  const fetchUnreadCount = async () => {
    const { data, error } = await withErrorHandling(
      () => apiService.getNotifications(),
      { showErrorAlert: false } // Bildirim sayısı hatası için alert gösterme
    );

    if (data && data.success && data.data && Array.isArray(data.data)) {
      const unread = data.data.filter((n: Notification) => !n.isRead).length;
      setUnreadCount(unread);
    } else {
      setUnreadCount(0);
    }
  };

  const getUserId = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // JWT token'dan user ID'yi çıkar (React Native uyumlu)
        const payload = JSON.parse(base64Decode(token.split('.')[1]));
        setUserId(payload.userId);
      }
    } catch (error) {
      }
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleCarPress = () => {
    navigation.navigate('Garage');
  };


  const quickActions = [
    {
      id: 'Tamir ve Bakım',
      title: 'Tamir ve Bakım',
      icon: 'wrench',
      color: '#3B82F6', // Mavi
      onPress: () => navigation.navigate('MaintenancePlan'),
    },
    {
      id: 'Araç Yıkama',
      title: 'Araç Yıkama',
      icon: 'water',
      color: '#10B981', // Yeşil
      onPress: () => navigation.navigate('WashBooking'),
    },
    {
      id: 'Yedek Parça',
      title: 'Yedek Parça',
      icon: 'package-variant',
      color: '#8B5CF6', // Mor
      onPress: () => navigation.navigate('PartsMarket'),
    },
    {
      id: 'Lastik',
      title: 'Lastik',
      icon: 'car',
      color: '#F59E0B', // Turuncu
      onPress: () => navigation.navigate('TireParts'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* User Profile Section */}
      <UserProfile
        userName={userName}
        favoriteCar={favoriteCar}
        onProfilePress={handleProfilePress}
        onCarPress={handleCarPress}
        onNotificationPress={() => navigation.navigate('Notifications')}
        unreadCount={unreadCount}
        navigation={navigation}
      />

      {/* Quick Actions Section */}
      <QuickActions actions={quickActions} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
});
