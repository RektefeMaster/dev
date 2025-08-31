import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../constants/config';
import { UserProfile } from './UserProfile';
import { QuickActions } from './QuickActions';

interface GreetingHeaderProps {
  userName: string;
  favoriteCar: {
    brand: string;
    model: string;
    plateNumber: string;
  } | null;
}

export const GreetingHeader: React.FC<GreetingHeaderProps> = ({ userName, favoriteCar }) => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const [userId, setUserId] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getUserId();
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const response = await fetch(`${API_URL}/notifications/driver`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data)) {
          const unread = data.data.filter((n: any) => !n.read).length;
          setUnreadCount(unread);
        }
      }
    } catch (error) {
      console.error('Bildirim sayısı alınamadı:', error);
    }
  };

  const getUserId = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // JWT token'dan user ID'yi çıkar
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.userId);
      }
    } catch (error) {
      console.error('User ID alınamadı:', error);
    }
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleCarPress = () => {
    navigation.navigate('Garage');
  };

  const handleNotificationCountChange = (count: number) => {
    setUnreadCount(count);
  };

  const quickActions = [
    {
      id: 'appointment',
      title: 'Randevu Al',
      icon: 'calendar-plus',
      color: '#007AFF',
      onPress: () => navigation.navigate('BookAppointment'),
    },
    {
      id: 'mechanic',
      title: 'Usta Ara',
      icon: 'account-wrench',
      color: '#34C759',
      onPress: () => navigation.navigate('MechanicSearch'),
    },
    {
      id: 'maintenance',
      title: 'Bakım Planı',
      icon: 'wrench',
      color: '#FF9500',
      onPress: () => navigation.navigate('MaintenancePlan'),
    },
    {
      id: 'wallet',
      title: 'Cüzdan',
      icon: 'wallet',
      color: '#AF52DE',
      onPress: () => navigation.navigate('Wallet'),
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
