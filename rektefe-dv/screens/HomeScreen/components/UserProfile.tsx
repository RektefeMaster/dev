import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
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
  navigation?: any;
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
  unreadCount = 0,
  navigation
}) => {
  const { theme } = useTheme();
  

  return (
    <View style={styles.container}>
      {/* Header Section with Notification */}
      <View style={styles.headerSection}>
        <View style={styles.greetingSection}>
          <Text style={[styles.greeting, { color: theme.colors.text.primary }]}>{getGreeting(userName)}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>Bugün nasılsın?</Text>
        </View>
        
        {/* Notification Bell Icon */}
        <TouchableOpacity style={[styles.notificationButton, { backgroundColor: theme.colors.background.secondary }]} onPress={onNotificationPress}>
          <MaterialCommunityIcons 
            name="bell-outline" 
            size={24} 
            color={theme.colors.text.primary} 
          />
          {unreadCount > 0 && (
            <View style={[styles.notificationBadge, { backgroundColor: theme.colors.text.primary }]}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* User Info Section */}
      <View style={styles.userInfoSection}>
        <TouchableOpacity style={[styles.profileButton, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]} onPress={onProfilePress} activeOpacity={0.7}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.colors.background.secondary }]}>
            <MaterialCommunityIcons name="account" size={28} color={theme.colors.text.primary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.colors.text.primary }]}>{userName}</Text>
            <Text style={[styles.userStatus, { color: theme.colors.text.secondary }]}>Aktif</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Favorite Car Section */}
      {favoriteCar && (
        <View style={styles.carSection}>
          <TouchableOpacity style={[styles.carButton, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]} onPress={onCarPress} activeOpacity={0.7}>
            <View style={[styles.carIcon, { backgroundColor: theme.colors.background.secondary }]}>
              <MaterialCommunityIcons name="car" size={22} color={theme.colors.text.primary} />
            </View>
            <View style={styles.carDetails}>
              <Text style={[styles.carTitle, { color: theme.colors.text.secondary }]}>Favori Aracım</Text>
              <Text style={[styles.carInfo, { color: theme.colors.text.primary }]}>
                {favoriteCar.brand} {favoriteCar.model}
              </Text>
              <Text style={[styles.carPlate, { color: theme.colors.text.secondary }]}>{favoriteCar.plateNumber}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.text.secondary} />
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
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    opacity: 0.8,
  },
  userInfoSection: {
    marginBottom: 15,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  userStatus: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  notificationButton: {
    position: 'relative',
    padding: 12,
    borderRadius: 24,
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
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  carIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  carDetails: {
    flex: 1,
  },
  carTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 3,
    opacity: 0.8,
  },
  carInfo: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  carPlate: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
});

export default UserProfile;
