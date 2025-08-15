import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Service {
  title: string;
  icon: string;
  color: string;
}

interface ServicesGridProps {
  services: Service[];
  onServicePress: (service: Service) => void;
}

export const ServicesGrid: React.FC<ServicesGridProps> = ({ services, onServicePress }) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {services.map((service, index) => (
            <TouchableOpacity
              key={index}
              style={styles.gridItem}
              onPress={() => onServicePress(service)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <MaterialCommunityIcons name={service.icon as any} size={32} color={service.color} />
              </View>
              <Text style={styles.title}>{service.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  scrollView: {
    maxHeight: 350,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  gridItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    color: '#f5f7fa',
    fontWeight: '600',
    textAlign: 'center',
  },
}); 