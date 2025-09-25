import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';

interface Vehicle {
  _id: string;
  brand: string;
  modelName: string;
  year: number;
  plateNumber: string;
  fuelType: string;
  engineType: string;
  transmission: string;
}

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  selectedVehicle: string;
  onSelectVehicle: (vehicleId: string) => void;
  loading?: boolean;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  loading = false
}) => {
  const { theme } = useTheme();

  const renderVehicleItem = ({ item }: { item: Vehicle }) => {
    const isSelected = selectedVehicle === item._id;
    
    return (
      <TouchableOpacity
        style={[
          styles.vehicleCard,
          { 
            backgroundColor: theme.colors.background.card,
            borderColor: isSelected ? theme.colors.primary.main : 'transparent'
          },
          isSelected && styles.selectedCard
        ]}
        onPress={() => onSelectVehicle(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.vehicleIcon}>
          <MaterialCommunityIcons 
            name="car" 
            size={32} 
            color={isSelected ? theme.colors.primary.main : theme.colors.text.secondary} 
          />
        </View>
        
        <View style={styles.vehicleInfo}>
          <Text style={[
            styles.vehicleName, 
            { color: isSelected ? theme.colors.primary.main : theme.colors.text.primary }
          ]}>
            {item.brand} {item.modelName}
          </Text>
          <Text style={[styles.vehicleDetails, { color: theme.colors.text.secondary }]}>
            {item.year} • {item.plateNumber}
          </Text>
          <Text style={[styles.vehicleSpecs, { color: theme.colors.text.secondary }]}>
            {item.fuelType} • {item.engineType} • {item.transmission}
          </Text>
        </View>
        
        {isSelected && (
          <View style={styles.checkIcon}>
            <MaterialCommunityIcons 
              name="check-circle" 
              size={24} 
              color={theme.colors.primary.main} 
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons 
          name="loading" 
          size={32} 
          color={theme.colors.text.secondary} 
        />
        <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
          Araçlarınız yükleniyor...
        </Text>
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons 
          name="car-off" 
          size={48} 
          color={theme.colors.text.secondary} 
        />
        <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
          Kayıtlı Araç Bulunamadı
        </Text>
        <Text style={[styles.emptyDescription, { color: theme.colors.text.secondary }]}>
          Arıza bildirimi yapabilmek için önce bir araç eklemeniz gerekiyor.
        </Text>
        <TouchableOpacity 
          style={[styles.addVehicleButton, { backgroundColor: theme.colors.primary.main }]}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addVehicleText}>Araç Ekle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Hangi aracınız için arıza bildirimi yapıyorsunuz?
      </Text>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      >
        {vehicles.map((vehicle) => (
          <View key={vehicle._id}>
            {renderVehicleItem({ item: vehicle })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedCard: {
    elevation: 4,
    shadowOpacity: 0.2,
  },
  vehicleIcon: {
    marginRight: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  vehicleSpecs: {
    fontSize: 12,
  },
  checkIcon: {
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addVehicleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
