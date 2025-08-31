import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

interface UserProfileProps {
  userName: string;
  favoriteCar: {
    brand: string;
    model: string;
    plateNumber: string;
  } | null;
  onProfilePress: () => void;
  onCarPress: () => void;
  onNotificationPress: () => void;
  unreadCount?: number;
}

const getGreeting = (userName: string) => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return `Günaydın ${userName}`;
  } else if (hour >= 12 && hour < 16) {
    return `Tünaydın ${userName}`;
  } else if (hour >= 16 && hour < 22) {
    return `İyi Akşamlar ${userName}`;
  } else {
    return `İyi Geceler ${userName}`;
  }
};

export const UserProfile: React.FC<UserProfileProps> = ({ 
  userName, 
  favoriteCar, 
  onProfilePress,
  onCarPress,
  onNotificationPress,
  unreadCount = 0
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  
  // Animasyon değerleri
  const hamburgerRotation = useRef(new Animated.Value(0)).current;
  const hamburgerScale = useRef(new Animated.Value(1)).current;
  const isMenuOpen = useRef(false);

  // Hamburger buton animasyonu
  const toggleHamburger = () => {
    const toValue = isMenuOpen.current ? 0 : 1;
    
    Animated.parallel([
      Animated.timing(hamburgerRotation, {
        toValue: toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(hamburgerScale, {
        toValue: 0.9,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.spring(hamburgerScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });

    isMenuOpen.current = !isMenuOpen.current;
    
    // Drawer'ı aç
    navigation.openDrawer();
  };

  // Drawer kapandığında hamburger'i sıfırla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isMenuOpen.current) {
        Animated.timing(hamburgerRotation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
        isMenuOpen.current = false;
      }
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Header Section with Hamburger and Notification */}
      <View style={styles.headerSection}>
        {/* Hamburger Menu Button */}
        <TouchableOpacity 
          style={styles.hamburgerButton} 
          onPress={toggleHamburger}
          activeOpacity={0.7}
        >
          <Animated.View style={[
            styles.hamburgerContainer,
            {
              transform: [
                { scale: hamburgerScale },
                { rotate: hamburgerRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg']
                })}
              ]
            }
          ]}>
            <View style={[
              styles.hamburgerLine,
              { backgroundColor: colors.primary.main }
            ]} />
            <View style={[
              styles.hamburgerLine,
              { backgroundColor: colors.primary.main }
            ]} />
            <View style={[
              styles.hamburgerLine,
              { backgroundColor: colors.primary.main }
            ]} />
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getGreeting(userName)}</Text>
          <Text style={styles.subtitle}>Bugün nasılsın?</Text>
        </View>
        
        {/* Notification Bell Icon */}
        <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
          <MaterialCommunityIcons 
            name="bell-outline" 
            size={28} 
            color={colors.primary.main} 
          />
          {unreadCount > 0 && (
            <View style={[styles.notificationBadge, { backgroundColor: colors.primary.main }]}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* User Info Section */}
      <View style={styles.userInfoSection}>
        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account" size={32} color={colors.primary.main} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userStatus}>Aktif</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Favorite Car Section */}
      {favoriteCar && (
        <View style={styles.carSection}>
          <TouchableOpacity style={styles.carButton} onPress={onCarPress}>
            <View style={styles.carIcon}>
              <MaterialCommunityIcons name="car" size={24} color={colors.primary.main} />
            </View>
            <View style={styles.carDetails}>
              <Text style={styles.carTitle}>Favori Aracım</Text>
              <Text style={styles.carInfo}>
                {favoriteCar.brand} {favoriteCar.model}
              </Text>
              <Text style={styles.carPlate}>{favoriteCar.plateNumber}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greetingSection: {
    flex: 1,
    marginBottom: 20,
    marginLeft: 15,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  userInfoSection: {
    marginBottom: 15,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  userStatus: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  carSection: {
    marginBottom: 15,
  },
  carButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  carDetails: {
    flex: 1,
  },
  carTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  carInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  carPlate: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  hamburgerButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hamburgerContainer: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
});

export default UserProfile;
