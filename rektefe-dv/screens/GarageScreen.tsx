import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import { useFocusEffect } from '@react-navigation/native';
import Background from '../components/Background';
import LottieView from 'lottie-react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import carData from '../assets/carData.json';

interface Vehicle {
  _id: string;
  userId: string;
  brand: string;
  model: string;
  package: string;
  year: string;
  fuelType: string;
  mileage: string;
  plate: string;
  isFavorite: boolean;
  createdAt: string;
}

const GarageScreen = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [transmissionOpen, setTransmissionOpen] = useState(false);

  const [brandValue, setBrandValue] = useState<string | null>(null);
  const [modelValue, setModelValue] = useState<string | null>(null);
  const [packageValue, setPackageValue] = useState<string | null>(null);
  const [fuelValue, setFuelValue] = useState<string | null>(null);
  const [transmissionValue, setTransmissionValue] = useState<string | null>(null);

  const [brandItems, setBrandItems] = useState<{label: string, value: string}[]>(carData.map(c => ({ label: c.brand, value: c.brand })));
  const [modelItems, setModelItems] = useState<{label: string, value: string}[]>([]);
  const [packageItems, setPackageItems] = useState<{label: string, value: string}[]>([]);
  const [fuelItems, setFuelItems] = useState<{label: string, value: string}[]>([]);
  const [transmissionItems, setTransmissionItems] = useState<{label: string, value: string}[]>([]);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error('userId alınırken hata:', error);
      }
    };
    getUserId();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchVehicles();
      }
    }, [userId])
  );

  useEffect(() => {
    if (userId) {
      fetchVehicles();
    }
  }, [userId]);

  useEffect(() => {
    if (brandValue) {
      const selectedBrand = carData.find(c => c.brand === brandValue);
      if (selectedBrand) {
        setModelItems(selectedBrand.models.map(m => ({ label: m.name, value: m.name })));
      } else {
        setModelItems([]);
      }
      setModelValue(null);
      setPackageValue(null);
      setFuelValue(null);
      setTransmissionValue(null);
      setPackageItems([]);
      setFuelItems([]);
      setTransmissionItems([]);
    }
  }, [brandValue]);

  useEffect(() => {
    if (brandValue && modelValue) {
      const selectedBrand = carData.find(c => c.brand === brandValue);
      const selectedModel = selectedBrand?.models.find(m => m.name === modelValue);
      if (selectedModel) {
        setPackageItems(selectedModel.packages.map(p => ({ label: p, value: p })));
        setFuelItems(selectedModel.fuelTypes.map(f => ({ label: f, value: f })));
        setTransmissionItems(selectedModel.transmissions.map(t => ({ label: t, value: t })));
      } else {
        setPackageItems([]);
        setFuelItems([]);
        setTransmissionItems([]);
      }
      setPackageValue(null);
      setFuelValue(null);
      setTransmissionValue(null);
    }
  }, [modelValue]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/vehicles/${userId}`);
      setVehicles(response.data);
    } catch (error) {
      Alert.alert('Hata', 'Araçlar yüklenirken bir hata oluştu.');
      console.error('Araçlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!brandValue || !modelValue || !newVehicle.year || !fuelValue || !newVehicle.plate || !transmissionValue) {
      Alert.alert('Uyarı', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/vehicles`, {
        userId,
        brand: brandValue,
        model: modelValue,
        package: packageValue || 'Standart',
        year: newVehicle.year,
        fuelType: fuelValue,
        transmission: transmissionValue,
        mileage: newVehicle.mileage || '0',
        plate: newVehicle.plate,
      });
      setVehicles([...vehicles, response.data]);
      setNewVehicle({});
      setBrandValue(null);
      setModelValue(null);
      setPackageValue(null);
      setFuelValue(null);
      setTransmissionValue(null);
      setShowAddModal(false);
      Alert.alert('Başarılı', 'Araç başarıyla eklendi.');
    } catch (error) {
      Alert.alert('Hata', 'Araç eklenirken bir hata oluştu.');
      console.error('Araç eklenirken hata:', error);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      await axios.delete(`${API_URL}/vehicles/${vehicleId}`);
      setVehicles(vehicles.filter(vehicle => vehicle._id !== vehicleId));
      Alert.alert('Başarılı', 'Araç başarıyla silindi.');
    } catch (error) {
      Alert.alert('Hata', 'Araç silinirken bir hata oluştu.');
      console.error('Araç silinirken hata:', error);
    }
  };

  const handleSetFavorite = async (vehicleId: string) => {
    const currentFavorite = vehicles.find(v => v.isFavorite);
    // Eğer tıklanan zaten favoriyse kaldır
    if (currentFavorite && currentFavorite._id === vehicleId) {
      try {
        await axios.patch(`${API_URL}/vehicles/${vehicleId}/favorite`, { userId, isFavorite: false });
        setVehicles(vehicles.map(v => v._id === vehicleId ? { ...v, isFavorite: false } : v));
        // Favori kaldırıldığında anasayfayı güncelle
        fetchVehicles();
      } catch (error) {
        Alert.alert('Hata', 'Favori araç kaldırılırken bir hata oluştu.');
      }
      return;
    }
    // Değilse favori olarak ayarla
    try {
      await axios.patch(`${API_URL}/vehicles/${vehicleId}/favorite`, { userId });
      setVehicles(vehicles.map(v => ({ ...v, isFavorite: v._id === vehicleId })));
      // Favori değiştiğinde anasayfayı güncelle
      fetchVehicles();
    } catch (error) {
      Alert.alert('Hata', 'Favori araç seçilirken bir hata oluştu.');
    }
  };

  const renderVehicleCard = (vehicle: Vehicle) => (
    <View key={vehicle._id} style={[styles.vehicleCard, vehicle.isFavorite && styles.favoriteCard]}>
      <View style={styles.vehicleHeader}>
        <MaterialCommunityIcons name="car" size={32} color="#007AFF" />
        <View style={styles.vehicleTitle}>
          <Text style={styles.vehicleBrand}>{vehicle.brand}</Text>
          <Text style={styles.vehicleModel}>{vehicle.model}</Text>
          <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => handleSetFavorite(vehicle._id)}
        >
          <MaterialCommunityIcons name={vehicle.isFavorite ? 'star' : 'star-outline'} size={28} color={vehicle.isFavorite ? '#FFD700' : '#bbb'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Araç Sil',
              'Bu aracı silmek istediğinizden emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', onPress: () => handleDeleteVehicle(vehicle._id), style: 'destructive' }
              ]
            );
          }}
        >
          <MaterialCommunityIcons name="delete" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Paket:</Text>
          <Text style={styles.detailValue}>{vehicle.package}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Yıl:</Text>
          <Text style={styles.detailValue}>{vehicle.year}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Yakıt:</Text>
          <Text style={styles.detailValue}>{vehicle.fuelType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Kilometre:</Text>
          <Text style={styles.detailValue}>{vehicle.mileage} km</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('../assets/loading.json')}
            autoPlay
            loop
            style={{ width: 120, height: 120 }}
          />
          <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex:1}}>
      <Background>
        <ScrollView style={{flex:1}} contentContainerStyle={{padding: 20, paddingBottom: 100}} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Garajım</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <MaterialCommunityIcons name="plus" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Araç Ekle</Text>
            </TouchableOpacity>
          </View>

          {vehicles.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="car-off" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Henüz araç eklenmemiş.{'\n'}
                Yeni bir araç eklemek için "Araç Ekle" butonuna tıklayın.
              </Text>
            </View>
          ) : (
            <View style={styles.vehiclesContainer}>
              {vehicles.map(renderVehicleCard)}
            </View>
          )}

          <Modal
            visible={showAddModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowAddModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Yeni Araç Ekle</Text>
                <DropDownPicker
                  open={brandOpen}
                  value={brandValue}
                  items={brandItems}
                  setOpen={setBrandOpen}
                  setValue={setBrandValue}
                  setItems={setBrandItems}
                  placeholder="Marka Seç"
                  style={styles.input}
                  zIndex={5000}
                  searchable={true}
                  searchPlaceholder="Ara..."
                />
                <DropDownPicker
                  open={modelOpen}
                  value={modelValue}
                  items={modelItems}
                  setOpen={setModelOpen}
                  setValue={setModelValue}
                  setItems={setModelItems}
                  placeholder="Model Seç"
                  style={styles.input}
                  zIndex={4000}
                  disabled={!brandValue}
                  searchable={true}
                  searchPlaceholder="Ara..."
                />
                <DropDownPicker
                  open={packageOpen}
                  value={packageValue}
                  items={packageItems}
                  setOpen={setPackageOpen}
                  setValue={setPackageValue}
                  setItems={setPackageItems}
                  placeholder="Paket Seç (Opsiyonel)"
                  style={styles.input}
                  zIndex={3500}
                  disabled={!modelValue}
                  searchable={true}
                  searchPlaceholder="Ara..."
                />
                <TextInput
                  style={styles.input}
                  placeholder="Yıl"
                  value={newVehicle.year}
                  onChangeText={(text) => setNewVehicle({ ...newVehicle, year: text })}
                  keyboardType="numeric"
                />
                <DropDownPicker
                  open={fuelOpen}
                  value={fuelValue}
                  items={fuelItems}
                  setOpen={setFuelOpen}
                  setValue={setFuelValue}
                  setItems={setFuelItems}
                  placeholder="Yakıt Türü Seç"
                  style={styles.input}
                  zIndex={3000}
                  disabled={!modelValue}
                  searchable={true}
                  searchPlaceholder="Ara..."
                />
                <DropDownPicker
                  open={transmissionOpen}
                  value={transmissionValue}
                  items={transmissionItems}
                  setOpen={setTransmissionOpen}
                  setValue={setTransmissionValue}
                  setItems={setTransmissionItems}
                  placeholder="Vites Türü Seç"
                  style={styles.input}
                  zIndex={2500}
                  disabled={!modelValue}
                  searchable={true}
                  searchPlaceholder="Ara..."
                />
                <TextInput
                  style={styles.input}
                  placeholder="Kilometre"
                  value={newVehicle.mileage}
                  onChangeText={(text) => setNewVehicle({ ...newVehicle, mileage: text })}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Plaka (örn: 34ABC123)"
                  value={newVehicle.plate}
                  onChangeText={(text) => setNewVehicle({ ...newVehicle, plate: text.toUpperCase() })}
                  autoCapitalize="characters"
                  keyboardType="default"
                  maxLength={9}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleAddVehicle}
                  >
                    <Text style={styles.saveButtonText}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </Background>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#f5f7fa',
    textAlign: 'center',
    lineHeight: 24,
  },
  vehiclesContainer: {
    padding: 16,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleTitle: {
    flex: 1,
    marginLeft: 12,
  },
  vehicleBrand: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  vehicleModel: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  vehiclePlate: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '700',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  vehicleDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(44,44,46,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    width: '94%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 18,
    borderWidth: 0.5,
    borderColor: '#ececec',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#f2f2f7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    fontSize: 17,
    borderWidth: 0,
    color: '#1c1c1e',
    shadowColor: 'transparent',
    elevation: 0,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f2f2f7',
    borderWidth: 0,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderWidth: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  favoriteButton: {
    marginHorizontal: 8,
  },
  favoriteCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
});

export default GarageScreen; 