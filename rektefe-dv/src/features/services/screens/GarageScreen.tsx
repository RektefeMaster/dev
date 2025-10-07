import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/config';
import { useFocusEffect } from '@react-navigation/native';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import LottieView from 'lottie-react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import carData from '@/constants/carData.json';
import { useAuth } from '@/context/AuthContext';

interface Vehicle {
  _id: string;
  userId: string;
  brand: string;
  modelName: string;
  package: string;
  year: number;
  engineType: string;
  fuelType: string;
  transmission: string;
  mileage: number;
  plateNumber: string;
  image?: string;
  createdAt: string;
  isFavorite?: boolean;
}

const GarageScreen = () => {
  const { token, userId, validateToken } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({});
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [transmissionOpen, setTransmissionOpen] = useState(false);

  const [brandValue, setBrandValue] = useState<string | null>(null);
  const [modelNameValue, setModelNameValue] = useState<string | null>(null);
  const [packageValue, setPackageValue] = useState<string | null>(null);
  const [fuelValue, setFuelValue] = useState<string | null>(null);
  const [transmissionValue, setTransmissionValue] = useState<string | null>(null);

  const [brandItems, setBrandItems] = useState<{label: string, value: string}[]>(carData.map(c => ({ label: c.brand, value: c.brand })));
  const [modelItems, setModelItems] = useState<{label: string, value: string}[]>([]);
  const [packageItems, setPackageItems] = useState<{label: string, value: string}[]>([]);
  const [fuelItems, setFuelItems] = useState<{label: string, value: string}[]>([]);
  const [transmissionItems, setTransmissionItems] = useState<{label: string, value: string}[]>([]);

  // Backend ile uyumlu yakıt tipi dönüştürücü
  const normalizeFuelType = (fuel: string): string => {
    if (!fuel) return fuel;
    if (fuel === 'Plug-in Hybrid') return 'Hybrid';
    if (fuel === 'LPG') return 'Benzin/Tüp';
    return fuel;
  };

  useFocusEffect(
    React.useCallback(() => {
      if (userId && !hasFetchedRef.current) {
        hasFetchedRef.current = true;
        fetchVehicles();
      }
    }, [userId])
  );

  useEffect(() => {
    if (brandValue) {
      const selectedBrand = carData.find(c => c.brand === brandValue);
      if (selectedBrand) {
        // Model adı uzunluk kontrolü ile filtreleme
        const validModels = selectedBrand.models.filter(m => m.name.length >= 2);
        if (validModels.length === 0) {
          Alert.alert(
            'Uyarı', 
            `${brandValue} markasında geçerli model bulunamadı. Model adları en az 2 karakter olmalıdır.`
          );
          setBrandValue(null);
          return;
        }
        setModelItems(validModels.map(m => ({ label: m.name, value: m.name })));
      } else {
        setModelItems([]);
      }
      setModelNameValue(null);
      setPackageValue(null);
      setFuelValue(null);
      setTransmissionValue(null);
      setPackageItems([]);
      setFuelItems([]);
      setTransmissionItems([]);
    }
  }, [brandValue]);

  useEffect(() => {
    if (brandValue && modelNameValue) {
      const selectedBrand = carData.find(c => c.brand === brandValue);
      const selectedModel = selectedBrand?.models.find(m => m.name === modelNameValue);
      if (selectedModel) {
        setPackageItems(selectedModel.packages.map(p => ({ label: p, value: p })));
        setFuelItems(selectedModel.fuelTypes.map(f => ({ label: f, value: normalizeFuelType(f) })));
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
  }, [modelNameValue]);

  const fetchVehicles = async () => {
    try {
      
      // Token kontrolü
      if (!token) {
        setVehicles([]);
        return;
      }
      
      // Token validasyonu kaldırıldı - AuthContext zaten kontrol ediyor
      
      setLoading(true);
      // Use API_URL from config
      const [vehiclesRes, userRes] = await Promise.all([
        axios.get(`${API_URL}/vehicles`, { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        }),
        axios.get(`${API_URL}/users/profile`, { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        }),
      ]);

      // API response formatı: { success: true, data: {...} }
      const favoriteVehicleId = userRes.data.data?.favoriteVehicle;
      if (vehiclesRes.data && vehiclesRes.data.success && vehiclesRes.data.data) {
        setVehicles(vehiclesRes.data.data.map((v: any) => ({ ...v, isFavorite: v._id === favoriteVehicleId })));
      } else {
        setVehicles([]);
      }
    } catch (error) {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    // Validation kontrolleri
    if (!brandValue) {
      Alert.alert('Uyarı', 'Lütfen marka seçin.');
      return;
    }
    
    if (!modelNameValue) {
      Alert.alert('Uyarı', 'Lütfen model seçin.');
      return;
    }
    
    if (!packageValue) {
      Alert.alert('Uyarı', 'Lütfen paket seçin.');
      return;
    }
    
    if (!newVehicle.year) {
      Alert.alert('Uyarı', 'Lütfen yıl girin.');
      return;
    }
    
    if (newVehicle.year < 1900 || newVehicle.year > new Date().getFullYear() + 1) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir yıl girin (1900-' + (new Date().getFullYear() + 1) + ').');
      return;
    }
    
    if (!fuelValue) {
      Alert.alert('Uyarı', 'Lütfen yakıt türü seçin.');
      return;
    }
    
    if (!transmissionValue) {
      Alert.alert('Uyarı', 'Lütfen vites türü seçin.');
      return;
    }
    
    if (!newVehicle.plateNumber) {
      Alert.alert('Uyarı', 'Lütfen plaka numarası girin.');
      return;
    }
    
    // Plaka formatı kontrolü (34ABC123 formatı)
    const plateRegex = /^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$/;
    if (!plateRegex.test(newVehicle.plateNumber)) {
      Alert.alert('Uyarı', 'Lütfen geçerli plaka formatı girin (örn: 34ABC123, 06A1234).');
      return;
    }
    
    // Model adı uzunluk kontrolü
    if (modelNameValue.length < 2) {
      Alert.alert('Uyarı', 'Model adı en az 2 karakter olmalıdır. Lütfen farklı bir model seçin.');
      return;
    }
    
    // Debug için gönderilecek veriyi logla
    const vehicleData = {
      brand: brandValue,
      modelName: modelNameValue,
      package: packageValue,
      year: newVehicle.year,
      engineType: 'Bilinmiyor',
      fuelType: normalizeFuelType(fuelValue as string),
      transmission: transmissionValue,
      plateNumber: newVehicle.plateNumber,
      mileage: newVehicle.mileage || 0, // ✅ MILEAGE ALANI EKLENDİ!
    };
    
    try {
      const response = await axios.post(`${API_URL}/vehicles`, vehicleData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      // API response formatı kontrol et
      if (response.data && response.data.success && response.data.data) {
        setVehicles([...vehicles, response.data.data]);
      } else {
        setVehicles([...vehicles, response.data]);
      }
      
      setNewVehicle({});
      setBrandValue(null);
      setModelNameValue(null);
      setPackageValue(null);
      setFuelValue(null);
      setTransmissionValue(null);
      setShowAddModal(false);
      Alert.alert('Başarılı', 'Araç başarıyla eklendi.');
    } catch (error: any) {
      let errorMessage = 'Araç eklenirken bir hata oluştu.';
      let errorTitle = 'Hata';
      
      if (error.response?.status === 400) {
        errorTitle = 'Validation Hatası';
        if (error.response?.data?.errors) {
          // Validation hatalarını daha kullanıcı dostu hale getir
          const errors = error.response.data.errors;
          if (typeof errors === 'string') {
            errorMessage = errors;
          } else if (typeof errors === 'object') {
            const errorList = Object.values(errors).join('\n• ');
            errorMessage = `Lütfen aşağıdaki hataları düzeltin:\n\n• ${errorList}`;
          }
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.response?.status === 401) {
        errorTitle = 'Yetki Hatası';
        errorMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
      } else if (error.response?.status === 403) {
        errorTitle = 'Erişim Hatası';
        errorMessage = 'Bu işlem için yetkiniz bulunmuyor.';
      } else if (error.response?.status === 409) {
        errorTitle = 'Çakışma Hatası';
        errorMessage = 'Bu plaka numarası zaten kullanılıyor.';
      } else if (error.response?.status >= 500) {
        errorTitle = 'Sunucu Hatası';
        errorMessage = 'Sunucuda bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        errorMessage = JSON.stringify(error.response.data);
      }
      
      Alert.alert(errorTitle, errorMessage);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      await axios.delete(`${API_URL}/vehicles/${vehicleId}`, { headers: { Authorization: `Bearer ${token}` } });
      setVehicles(vehicles.filter(vehicle => vehicle._id !== vehicleId));
      Alert.alert('Başarılı', 'Araç başarıyla silindi.');
    } catch (error) {
      Alert.alert('Hata', 'Araç silinirken bir hata oluştu.');
      }
  };

  const handleSetFavorite = async (vehicleId: string) => {
    // 1. Önce ekranda anında güncelle
    setVehicles(prev =>
      prev.map(v => ({ ...v, isFavorite: v._id === vehicleId ? !v.isFavorite : false }))
    );

    try {
      await axios.put(`${API_URL}/vehicles/${vehicleId}/favorite`, {}, { headers: { Authorization: `Bearer ${token}` } });
      // Backend'den güncel veriyi al
      await fetchVehicles();
    } catch (error) {
      Alert.alert('Hata', 'Favori araç seçilirken bir hata oluştu.');
      // Hata olursa geri yükle
      await fetchVehicles();
    }
  };

  const renderVehicleCard = (vehicle: Vehicle) => (
    <View key={vehicle._id} style={[styles.vehicleCard, vehicle.isFavorite && styles.favoriteCard]}>
      <View style={styles.vehicleHeader}>
        <MaterialCommunityIcons name="car" size={32} color="#007AFF" />
        <View style={styles.vehicleTitle}>
          <Text style={[
            styles.vehicleBrand,
            {
              fontSize: (() => {
                const text = vehicle.brand || '';
                if (text.length > 15) return 14;
                if (text.length > 12) return 16;
                return 18;
              })()
            }
          ]}>{vehicle.brand}</Text>
          <Text style={[
            styles.vehicleModel,
            {
              fontSize: (() => {
                const text = vehicle.modelName || '';
                if (text.length > 20) return 12;
                if (text.length > 15) return 14;
                return 16;
              })()
            }
          ]}>{vehicle.modelName}</Text>
          <Text style={[
            styles.vehiclePlate,
            {
              fontSize: (() => {
                const text = vehicle.plateNumber || '';
                if (text.length > 10) return 12;
                if (text.length > 8) return 14;
                return 16;
              })()
            }
          ]}>{vehicle.plateNumber}</Text>
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
            source={require('../../../../assets/loading.json')}
            autoPlay
            loop
            style={{ width: 120, height: 120 }}
          />
          <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
          <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8 }]}>
            Token: {token ? 'Mevcut' : 'Yok'} | UserId: {userId ? 'Mevcut' : 'Yok'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex:1}}>
      <Background>
        <ScrollView style={{flex:1}} contentContainerStyle={{padding: 20, paddingBottom: 100}} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <BackButton />
            <Text style={styles.title}>Garajım</Text>
            <TouchableOpacity
              style={[styles.addButton, !token && styles.disabledButton]}
              onPress={() => setShowAddModal(true)}
              disabled={!token}
            >
              <MaterialCommunityIcons name="plus" size={24} color={token ? "#fff" : "#ccc"} />
              <Text style={[styles.addButtonText, !token && styles.disabledButtonText]}>Araç Ekle</Text>
            </TouchableOpacity>
          </View>

          {vehicles.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="car-off" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>
                {!token ? 'Oturum açmanız gerekiyor.' : 'Henüz araç eklenmemiş.'}
                {token && '\nYeni bir araç eklemek için "Araç Ekle" butonuna tıklayın.'}
              </Text>
              {!token && (
                <Text style={[styles.emptyStateText, { fontSize: 14, marginTop: 16, opacity: 0.8 }]}>
                  Lütfen önce giriş yapın
                </Text>
              )}
              <Text style={[styles.emptyStateText, { fontSize: 12, marginTop: 16, opacity: 0.7 }]}>
                Debug: Token: {token ? 'Mevcut' : 'Yok'} | UserId: {userId ? 'Mevcut' : 'Yok'}
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
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <KeyboardAvoidingView 
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={styles.modalKeyboardView}
                >
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderContent}>
                      <MaterialCommunityIcons name="car-plus" size={28} color="#007AFF" />
                      <Text style={styles.modalTitle}>Yeni Araç Ekle</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setShowAddModal(false)}
                    >
                      <MaterialCommunityIcons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView 
                    style={styles.modalScrollView}
                    contentContainerStyle={styles.modalScrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  >
                    <View style={styles.formContainer}>
                      <Text style={styles.formDescription}>
                        Aracınızın bilgilerini eksiksiz doldurun
                      </Text>

                      {/* Marka Seçimi */}
                      <View style={styles.inputGroup}>
                        <View style={styles.inputHeader}>
                          <MaterialCommunityIcons name="car" size={20} color="#007AFF" />
                          <Text style={styles.inputLabel}>Marka</Text>
                        </View>
                        <DropDownPicker
                          open={brandOpen}
                          value={brandValue}
                          items={brandItems}
                          setOpen={setBrandOpen}
                          setValue={setBrandValue}
                          setItems={setBrandItems}
                          placeholder="Marka seçin"
                          style={styles.modernInput}
                          dropDownContainerStyle={styles.dropdownContainer}
                          zIndex={5000}
                          searchable={true}
                          searchPlaceholder="Marka ara..."
                          placeholderStyle={styles.placeholderText}
                          textStyle={styles.dropdownText}
                        />
                      </View>
                
                      {/* Model Seçimi */}
                      <View style={styles.inputGroup}>
                        <View style={styles.inputHeader}>
                          <MaterialCommunityIcons name="car-info" size={20} color="#007AFF" />
                          <Text style={styles.inputLabel}>Model</Text>
                        </View>
                        <DropDownPicker
                          open={modelOpen}
                          value={modelNameValue}
                          items={modelItems}
                          setOpen={setModelOpen}
                          setValue={setModelNameValue}
                          setItems={setModelItems}
                          placeholder="Model seçin"
                          style={[styles.modernInput, !brandValue && styles.disabledInput]}
                          dropDownContainerStyle={styles.dropdownContainer}
                          zIndex={4000}
                          disabled={!brandValue}
                          searchable={true}
                          searchPlaceholder="Model ara..."
                          placeholderStyle={styles.placeholderText}
                          textStyle={styles.dropdownText}
                        />
                      </View>
                
                      {/* Paket Seçimi */}
                      <View style={styles.inputGroup}>
                        <View style={styles.inputHeader}>
                          <MaterialCommunityIcons name="package-variant" size={20} color="#007AFF" />
                          <Text style={styles.inputLabel}>Paket</Text>
                        </View>
                        <DropDownPicker
                          open={packageOpen}
                          value={packageValue}
                          items={packageItems}
                          setOpen={setPackageOpen}
                          setValue={setPackageValue}
                          setItems={setPackageItems}
                          placeholder="Paket seçin"
                          style={[styles.modernInput, !modelNameValue && styles.disabledInput]}
                          dropDownContainerStyle={styles.dropdownContainer}
                          zIndex={3500}
                          disabled={!modelNameValue}
                          searchable={true}
                          searchPlaceholder="Paket ara..."
                          placeholderStyle={styles.placeholderText}
                          textStyle={styles.dropdownText}
                        />
                      </View>
                
                      {/* Yıl Girişi */}
                      <View style={styles.inputGroup}>
                        <View style={styles.inputHeader}>
                          <MaterialCommunityIcons name="calendar" size={20} color="#007AFF" />
                          <Text style={styles.inputLabel}>Yıl</Text>
                        </View>
                        <TextInput
                          style={styles.modernTextInput}
                          placeholder="2024"
                          value={newVehicle.year ? String(newVehicle.year) : ''}
                          onChangeText={(text) => setNewVehicle({ ...newVehicle, year: Number(text) })}
                          keyboardType="numeric"
                          placeholderTextColor="#8E8E93"
                          maxLength={4}
                        />
                      </View>
                
                      {/* Yakıt Türü Seçimi */}
                      <View style={styles.inputGroup}>
                        <View style={styles.inputHeader}>
                          <MaterialCommunityIcons name="fuel" size={20} color="#007AFF" />
                          <Text style={styles.inputLabel}>Yakıt Türü</Text>
                        </View>
                        <DropDownPicker
                          open={fuelOpen}
                          value={fuelValue}
                          items={fuelItems}
                          setOpen={setFuelOpen}
                          setValue={setFuelValue}
                          setItems={setFuelItems}
                          placeholder="Yakıt türü seçin"
                          style={[styles.modernInput, !modelNameValue && styles.disabledInput]}
                          dropDownContainerStyle={styles.dropdownContainer}
                          zIndex={3000}
                          disabled={!modelNameValue}
                          searchable={true}
                          searchPlaceholder="Yakıt türü ara..."
                          placeholderStyle={styles.placeholderText}
                          textStyle={styles.dropdownText}
                        />
                      </View>
                
                      {/* Vites Türü Seçimi */}
                      <View style={styles.inputGroup}>
                        <View style={styles.inputHeader}>
                          <MaterialCommunityIcons name="cog" size={20} color="#007AFF" />
                          <Text style={styles.inputLabel}>Vites Türü</Text>
                        </View>
                        <DropDownPicker
                          open={transmissionOpen}
                          value={transmissionValue}
                          items={transmissionItems}
                          setOpen={setTransmissionOpen}
                          setValue={setTransmissionValue}
                          setItems={setTransmissionItems}
                          placeholder="Vites türü seçin"
                          style={[styles.modernInput, !modelNameValue && styles.disabledInput]}
                          dropDownContainerStyle={styles.dropdownContainer}
                          zIndex={2500}
                          disabled={!modelNameValue}
                          searchable={true}
                          searchPlaceholder="Vites türü ara..."
                          placeholderStyle={styles.placeholderText}
                          textStyle={styles.dropdownText}
                        />
                      </View>
                
                      {/* Kilometre Girişi */}
                      <View style={styles.inputGroup}>
                        <View style={styles.inputHeader}>
                          <MaterialCommunityIcons name="speedometer" size={20} color="#007AFF" />
                          <Text style={styles.inputLabel}>Kilometre</Text>
                        </View>
                        <TextInput
                          style={styles.modernTextInput}
                          placeholder="150000"
                          value={newVehicle.mileage ? String(newVehicle.mileage) : ''}
                          onChangeText={(text) => setNewVehicle({ ...newVehicle, mileage: Number(text) })}
                          keyboardType="numeric"
                          placeholderTextColor="#8E8E93"
                        />
                      </View>
                
                      {/* Plaka Girişi */}
                      <View style={styles.inputGroup}>
                        <View style={styles.inputHeader}>
                          <MaterialCommunityIcons name="car-tag" size={20} color="#007AFF" />
                          <Text style={styles.inputLabel}>Plaka Numarası</Text>
                        </View>
                        <TextInput
                          style={styles.modernTextInput}
                          placeholder="34ABC123"
                          value={newVehicle.plateNumber}
                          onChangeText={(text) => setNewVehicle({ ...newVehicle, plateNumber: text.toUpperCase() })}
                          autoCapitalize="characters"
                          keyboardType="default"
                          maxLength={9}
                          placeholderTextColor="#8E8E93"
                        />
                      </View>
                    </View>
                  </ScrollView>
                  
                  {/* Modern Butonlar */}
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={styles.cancelButtonModern}
                      onPress={() => setShowAddModal(false)}
                    >
                      <MaterialCommunityIcons name="close" size={20} color="#666" />
                      <Text style={styles.cancelButtonTextModern}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButtonModern}
                      onPress={handleAddVehicle}
                    >
                      <MaterialCommunityIcons name="check" size={20} color="#fff" />
                      <Text style={styles.saveButtonTextModern}>Araç Ekle</Text>
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
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
    flex: 1,
    textAlign: 'center',
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
    borderWidth: 2,
    borderColor: 'transparent',
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
  // Modern Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '70%',
  },
  modalKeyboardView: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  formContainer: {
    padding: 20,
  },
  formDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  modernInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  modernTextInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
    minHeight: 48,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  dropdownContainer: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  placeholderText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButtonModern: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 8,
  },
  cancelButtonTextModern: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonModern: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonTextModern: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
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
  inputLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginLeft: 4,
    marginBottom: 8,
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
  modalButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.1,
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
  disabledButton: {
    backgroundColor: '#ccc',
    shadowColor: '#ccc',
  },
  disabledButtonText: {
    color: '#999',
  },

});

export default GarageScreen; 