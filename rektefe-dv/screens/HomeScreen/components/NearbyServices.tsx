import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Service {
  _id: string;
  name: string;
  serviceType: string;
  rating: number;
  reviewCount: number;
  address: {
    city: string;
    district: string;
    neighborhood: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
  };
  priceRange: string;
  image: string;
  isAvailable: boolean;
  lastUpdate: string;
}

interface NearbyServicesProps {
  services: Service[];
  onServicePress: (service: Service) => void;
}

export const NearbyServices: React.FC<NearbyServicesProps> = ({ services, onServicePress }) => {
  // Services prop'unun undefined olma durumunu kontrol et
  if (!services || !Array.isArray(services)) {
    console.warn('NearbyServices: services prop is not an array:', services);
    return null; // veya loading state göster
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Yakındaki Servisler</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {services.map((service) => (
          <TouchableOpacity
            key={service._id}
            style={styles.card}
            onPress={() => onServicePress(service)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: service.image }} style={styles.image} />
            <View style={styles.content}>
              <Text style={styles.name}>{service.name}</Text>
              <View style={styles.details}>
                <View style={styles.rating}>
                  <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {service.rating} ({service.reviewCount} yorum)
                  </Text>
                </View>
                <Text style={styles.address}>
                  {service.address.neighborhood}, {service.address.street}
                </Text>
              </View>
              <Text style={styles.price}>{service.priceRange}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    marginLeft: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    width: 280,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
  },
  address: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  price: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 8,
  },
}); 