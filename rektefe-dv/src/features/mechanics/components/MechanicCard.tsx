import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking, Alert } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { MechanicSearchResult } from '@/shared/types/common';
import { openLocationInMaps } from '@/shared/utils/distanceCalculator';

interface MechanicCardProps {
  mechanic: MechanicSearchResult;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onPress: () => void;
  onCall: () => void;
  onMessage: () => void;
  onOpenInMaps: () => void;
}

export const MechanicCard: React.FC<MechanicCardProps> = ({
  mechanic,
  isExpanded,
  onToggleExpansion,
  onPress,
  onCall,
  onMessage,
  onOpenInMaps,
}) => {
  const { theme } = useTheme();

  const formatWorkingHours = (workingHours: any) => {
    if (!workingHours) return 'Bilgi yok';
    
    try {
      // JSON string ise parse et
      const hours = typeof workingHours === 'string' ? JSON.parse(workingHours) : workingHours;
      
      const today = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[today.getDay()];
      const currentTime = today.getHours() * 100 + today.getMinutes();
      
      const todaySchedule = hours[currentDay];
      
      if (!todaySchedule || !todaySchedule.isOpen) {
        return 'Kapalı';
      }
      
      const startTime = parseInt(todaySchedule.start.replace(':', ''));
      const endTime = parseInt(todaySchedule.end.replace(':', ''));
      
      if (currentTime >= startTime && currentTime <= endTime) {
        return `Müsait • ${todaySchedule.start} - ${todaySchedule.end}`;
      } else {
        return `Müsait Değil • ${todaySchedule.start} - ${todaySchedule.end}`;
      }
    } catch (error) {
      return 'Bilgi yok';
    }
  };

  const getAvailabilityStatus = (workingHours: any) => {
    if (!workingHours) return { isAvailable: false, text: 'Bilgi yok' };
    
    try {
      const hours = typeof workingHours === 'string' ? JSON.parse(workingHours) : workingHours;
      
      const today = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[today.getDay()];
      const currentTime = today.getHours() * 100 + today.getMinutes();
      
      const todaySchedule = hours[currentDay];
      
      if (!todaySchedule || !todaySchedule.isOpen) {
        return { isAvailable: false, text: 'Müsait Değil' };
      }
      
      const startTime = parseInt(todaySchedule.start.replace(':', ''));
      const endTime = parseInt(todaySchedule.end.replace(':', ''));
      
      if (currentTime >= startTime && currentTime <= endTime) {
        return { isAvailable: true, text: 'Müsait' };
      } else {
        return { isAvailable: false, text: 'Müsait Değil' };
      }
    } catch (error) {
      return { isAvailable: false, text: 'Bilgi yok' };
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color={star <= rating ? '#F59E0B' : '#D1D5DB'}
          />
        ))}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.mechanicCard, { backgroundColor: theme.colors.background.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[theme.colors.primary.main + '10', 'transparent']}
        style={styles.cardGradient}
      />
      
      <View style={styles.cardHeader}>
        <View style={styles.mechanicInfo}>
          <Image
            source={{
              uri: mechanic.avatar || 'https://via.placeholder.com/60x60?text=Usta'
            }}
            style={styles.mechanicAvatar}
          />
          <View style={styles.mechanicDetails}>
            <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
              {mechanic.name} {mechanic.surname}
            </Text>
            {mechanic.shopName && (
              <Text style={[styles.shopName, { color: theme.colors.text.secondary }]}>
                {mechanic.shopName}
              </Text>
            )}
            <View style={styles.ratingContainer}>
              {renderStars(mechanic.rating)}
              <Text style={[styles.ratingText, { color: theme.colors.text.secondary }]}>
                {mechanic.rating.toFixed(1)} ({mechanic.ratingCount || 0})
              </Text>
            </View>
            <Text style={[styles.locationText, { color: theme.colors.text.secondary }]}>
              📍 {mechanic.city} • {mechanic.formattedDistance || 'Uzaklık hesaplanıyor...'}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusContainer}>
          {(() => {
            const availability = getAvailabilityStatus(mechanic.workingHours);
            return (
              <View style={[
                styles.statusBadge,
                { backgroundColor: availability.isAvailable ? '#10B981' : '#EF4444' }
              ]}>
                <Text style={styles.statusText}>
                  {availability.text}
                </Text>
              </View>
            );
          })()}
          <TouchableOpacity
            onPress={onToggleExpansion}
            style={styles.expandButton}
          >
            <MaterialCommunityIcons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hizmet kategorileri */}
      <View style={styles.servicesContainer}>
        {mechanic.serviceCategories?.slice(0, 3).map((service, index) => (
          <View
            key={index}
            style={[styles.serviceTag, { backgroundColor: theme.colors.primary.main + '20' }]}
          >
            <Text style={[styles.serviceText, { color: theme.colors.primary.main }]}>
              {service}
            </Text>
          </View>
        ))}
        {mechanic.serviceCategories && mechanic.serviceCategories.length > 3 && (
          <Text style={[styles.moreServices, { color: theme.colors.text.secondary }]}>
            +{mechanic.serviceCategories.length - 3} daha
          </Text>
        )}
      </View>

      {/* Genişletilmiş bilgiler */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.expandedInfo}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="account-hard-hat" size={16} color={theme.colors.text.secondary} />
              <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                {mechanic.experience} yıl deneyim • {mechanic.totalJobs} iş tamamlandı
              </Text>
            </View>
            
            {mechanic.workingHours && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.text.secondary} />
                <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                  Bugün: {formatWorkingHours(mechanic.workingHours)}
                </Text>
              </View>
            )}

            {mechanic.bio && (
              <View style={styles.bioContainer}>
                <Text style={[styles.bioText, { color: theme.colors.text.primary }]}>
                  {mechanic.bio}
                </Text>
              </View>
            )}
          </View>

          {/* Aksiyon butonları */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={onCall}
            >
              <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Ara</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.background.secondary }]}
              onPress={onMessage}
            >
              <MaterialCommunityIcons name="message-text" size={18} color={theme.colors.text.primary} />
              <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>Mesaj</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.background.secondary }]}
              onPress={onOpenInMaps}
            >
              <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.text.primary} />
              <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>Konum</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  mechanicCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  mechanicInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  mechanicAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  mechanicDetails: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 14,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  expandButton: {
    padding: 4,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  serviceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  serviceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreServices: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  expandedInfo: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
  },
  bioContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
