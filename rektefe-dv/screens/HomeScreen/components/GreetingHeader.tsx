import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../constants/config';
import { UserProfile } from './UserProfile';
import { QuickActions } from './QuickActions';
import { NotificationList } from './NotificationList';

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
      console.log('🔍 GreetingHeader: propUserId alındı:', propUserId);
    } else {
      getUserId();
    }
    fetchUnreadCount();
  }, [propUserId]);

  const fetchUnreadCount = async () => {
    try {
      console.log('🔍 GreetingHeader: Bildirim sayısı getiriliyor...');
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const response = await fetch(`${API_URL}/notifications/driver`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        console.log('📱 GreetingHeader API Response:', data);
        
        if (data.success && data.data && Array.isArray(data.data)) {
          const unread = data.data.filter((n: any) => !n.isRead).length;
          setUnreadCount(unread);
          console.log('✅ GreetingHeader: Okunmamış bildirim sayısı:', unread);
        } else {
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error('❌ GreetingHeader: Bildirim sayısı alınamadı:', error);
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
      id: 'towing',
      title: 'Çekici',
      icon: 'truck',
      color: '#EF4444', // Kırmızı
      onPress: () => navigation.navigate('TowingRequest'),
    },
    {
      id: 'repair',
      title: 'Tamir & Bakım',
      icon: 'wrench',
      color: '#3B82F6', // Mavi
      onPress: () => navigation.navigate('MaintenancePlan'),
    },
    {
      id: 'wash',
      title: 'Yıkama',
      icon: 'water',
      color: '#10B981', // Yeşil
      onPress: () => navigation.navigate('WashBooking'),
    },
    {
      id: 'tire',
      title: 'Lastik & Parça',
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

      {/* Notification List */}
      {userId && (
        <>
          {console.log('🔍 GreetingHeader: NotificationList render ediliyor, userId:', userId)}
          <NotificationList
            userId={userId}
            onNotificationCountChange={handleNotificationCountChange}
            navigation={navigation}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
});
