import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { UserLocation } from '@/shared/services/locationService';

interface LocationDisplayProps {
  location: UserLocation | null;
  locationAddress: string;
  locationLoading: boolean;
  onRefreshLocation: () => void;
  isLocationRequired?: boolean;
}

export const LocationDisplay: React.FC<LocationDisplayProps> = ({
  location,
  locationAddress,
  locationLoading,
  onRefreshLocation,
  isLocationRequired = false,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Konum Bilgisi {isLocationRequired && <Text style={{ color: theme.colors.error.main }}>*</Text>}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        {isLocationRequired 
          ? 'Çekici hizmeti için konum bilgisi gereklidir' 
          : 'Mevcut konumunuz ustalara gönderilecek (opsiyonel)'
        }
      </Text>
      
      <View style={[styles.locationCard, { backgroundColor: theme.colors.background.secondary }]}>
        {locationLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
              Konum alınıyor...
            </Text>
          </View>
        ) : location ? (
          <View style={styles.locationInfo}>
            <View style={styles.locationIcon}>
              <MaterialCommunityIcons 
                name="map-marker" 
                size={24} 
                color={theme.colors.primary.main} 
              />
            </View>
            <View style={styles.locationDetails}>
              {locationAddress ? (
                <Text style={[styles.address, { color: theme.colors.text.primary }]}>
                  {locationAddress}
                </Text>
              ) : (
                <Text style={[styles.coordinates, { color: theme.colors.text.secondary }]}>
                  Enlem: {location.latitude.toFixed(6)}
                </Text>
              )}
              <Text style={[styles.coordinates, { color: theme.colors.text.secondary }]}>
                Boylam: {location.longitude.toFixed(6)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noLocationContainer}>
            <MaterialCommunityIcons 
              name="map-marker-off" 
              size={32} 
              color={theme.colors.text.secondary} 
            />
            <Text style={[styles.noLocationText, { color: theme.colors.text.secondary }]}>
              Konum bilgisi alınamadı
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.colors.primary.main }]}
          onPress={onRefreshLocation}
          disabled={locationLoading}
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.refreshButtonText}>Yenile</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoContainer}>
        <MaterialCommunityIcons 
          name="information" 
          size={16} 
          color={theme.colors.text.secondary} 
        />
        <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
          Konum bilginiz sadece size yakın ustaları bulmak için kullanılır ve gizliliğiniz korunur.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  locationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  locationDetails: {
    flex: 1,
  },
  address: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 14,
  },
  noLocationContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noLocationText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
  },
});
