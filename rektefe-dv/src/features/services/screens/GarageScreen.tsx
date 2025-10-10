import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '@/constants/config';
import { useFocusEffect } from '@react-navigation/native';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import LottieView from 'lottie-react-native';
import { useAuth } from '@/context/AuthContext';
import carData from '@/constants/carData.json';

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
  const { token, userId } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  // Refs for scroll
  const scrollViewRef = useRef<ScrollView>(null);

  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    package: '',
    year: '',
    fuelType: '',
    transmission: '',
    mileage: '',
    plateNumber: ''
  });

  // Search states
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // Available options
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [availablePackages, setAvailablePackages] = useState<string[]>([]);
  const [availableFuelTypes, setAvailableFuelTypes] = useState<string[]>([]);
  const [availableTransmissions, setAvailableTransmissions] = useState<string[]>([]);

  // Filtered brands based on search
  const filteredBrands = carData.filter(brand => 
    brand.brand.toLowerCase().includes(brandSearch.toLowerCase())
  );

  // Filtered models based on search
  const filteredModels = availableModels.filter(model =>
    model.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  useFocusEffect(
    React.useCallback(() => {
      if (userId && !hasFetchedRef.current) {
        hasFetchedRef.current = true;
        fetchVehicles();
      }
    }, [userId])
  );

  const fetchVehicles = async () => {
    try {
      if (!token) {
        setVehicles([]);
        return;
      }
      
      setLoading(true);
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

  // Brand seçildiğinde modelleri güncelle ve model seçimine geç
  const handleBrandChange = (brand: string) => {
    setFormData(prev => ({
      ...prev,
      brand,
      model: '',
      package: '',
      fuelType: '',
      transmission: ''
    }));

    const selectedBrand = carData.find(b => b.brand === brand);
    if (selectedBrand) {
      setAvailableModels(selectedBrand.models);
    } else {
      setAvailableModels([]);
    }
    setAvailablePackages([]);
    setAvailableFuelTypes([]);
    setAvailableTransmissions([]);

    // Model seçimine kaydır
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 200, animated: true });
    }, 100);
  };

  // Model seçildiğinde paket, yakıt ve vites seçeneklerini güncelle ve paket seçimine geç
  const handleModelChange = (model: string) => {
    setFormData(prev => ({
      ...prev,
      model,
      package: '',
      fuelType: '',
      transmission: ''
    }));

    const selectedBrand = carData.find(b => b.brand === formData.brand);
    const selectedModel = selectedBrand?.models.find(m => m.name === model);
    
    if (selectedModel) {
      setAvailablePackages(selectedModel.packages);
      setAvailableFuelTypes(selectedModel.fuelTypes);
      setAvailableTransmissions(selectedModel.transmissions);
    } else {
      setAvailablePackages([]);
      setAvailableFuelTypes([]);
      setAvailableTransmissions([]);
    }

    // Paket seçimine kaydır
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 400, animated: true });
    }, 100);
  };

  // Paket seçildiğinde yakıt türü seçimine geç
  const handlePackageChange = (packageName: string) => {
    setFormData(prev => ({ ...prev, package: packageName }));
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 600, animated: true });
    }, 100);
  };

  // Yakıt türü seçildiğinde vites türü seçimine geç
  const handleFuelTypeChange = (fuelType: string) => {
    setFormData(prev => ({ ...prev, fuelType }));
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 800, animated: true });
    }, 100);
  };

  // Vites türü seçildiğinde yıl inputuna odaklan
  const handleTransmissionChange = (transmission: string) => {
    setFormData(prev => ({ ...prev, transmission }));
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 1000, animated: true });
    }, 100);
  };

  const resetForm = () => {
    setFormData({
      brand: '',
      model: '',
      package: '',
      year: '',
      fuelType: '',
      transmission: '',
      mileage: '',
      plateNumber: ''
    });
    setBrandSearch('');
    setModelSearch('');
    setAvailableModels([]);
    setAvailablePackages([]);
    setAvailableFuelTypes([]);
    setAvailableTransmissions([]);
  };

  const handleCloseModal = () => {
    // Klavyeyi kapat
    Keyboard.dismiss();
    
    // Form doluysa onay iste
    const hasData = formData.brand || formData.model || formData.package || 
                    formData.year || formData.plateNumber || formData.mileage;
    
    if (hasData) {
      Alert.alert(
        'Formu Kapat',
        'Girdiğiniz bilgiler kaybolacak. Emin misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { 
            text: 'Kapat', 
            style: 'destructive',
            onPress: () => {
              resetForm();
              setShowAddModal(false);
            }
          }
        ]
      );
    } else {
      resetForm();
      setShowAddModal(false);
    }
  };

  const handleAddVehicle = async () => {
    // Validation
    if (!formData.brand || !formData.model || !formData.package || !formData.year || 
        !formData.fuelType || !formData.transmission || !formData.plateNumber) {
      Alert.alert('Uyarı', 'Lütfen tüm gerekli alanları doldurun.');
      return;
    }
    
    const vehicleData = {
      brand: formData.brand,
      modelName: formData.model,
      package: formData.package,
      year: Number(formData.year),
      engineType: 'Bilinmiyor',
      fuelType: formData.fuelType === 'LPG' ? 'Benzin/Tüp' : formData.fuelType === 'Plug-in Hybrid' ? 'Hybrid' : formData.fuelType,
      transmission: formData.transmission,
      plateNumber: formData.plateNumber,
      mileage: Number(formData.mileage) || 0,
    };
    
    try {
      const response = await axios.post(`${API_URL}/vehicles`, vehicleData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (response.data && response.data.success && response.data.data) {
        setVehicles([...vehicles, response.data.data]);
      } else {
        setVehicles([...vehicles, response.data]);
      }
      
      resetForm();
      setShowAddModal(false);
      Alert.alert('Başarılı', 'Araç başarıyla eklendi.');
    } catch (error: any) {
      Alert.alert('Hata', 'Araç eklenirken bir hata oluştu.');
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
    setVehicles(prev =>
      prev.map(v => ({ ...v, isFavorite: v._id === vehicleId ? !v.isFavorite : false }))
    );

    try {
      await axios.put(`${API_URL}/vehicles/${vehicleId}/favorite`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await fetchVehicles();
    } catch (error) {
      Alert.alert('Hata', 'Favori araç seçilirken bir hata oluştu.');
      await fetchVehicles();
    }
  };

  const renderVehicleCard = (vehicle: Vehicle) => (
    <View key={vehicle._id} style={[styles.vehicleCard, vehicle.isFavorite && styles.favoriteCard]}>
      <View style={styles.vehicleHeader}>
        <View style={styles.carIconContainer}>
          <MaterialCommunityIcons name="car-side" size={28} color="#007AFF" />
        </View>
        <View style={styles.vehicleTitle}>
          <Text style={styles.vehicleBrand}>{vehicle.brand}</Text>
          <Text style={styles.vehicleModel}>{vehicle.modelName}</Text>
          <Text style={styles.vehiclePlate}>{vehicle.plateNumber}</Text>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => handleSetFavorite(vehicle._id)}
        >
          <MaterialCommunityIcons 
            name={vehicle.isFavorite ? 'star' : 'star-outline'} 
            size={24} 
            color={vehicle.isFavorite ? '#FFD700' : '#ccc'} 
          />
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
          <MaterialCommunityIcons name="delete-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <MaterialCommunityIcons name="package-variant" size={16} color="#666" />
            <Text style={styles.detailLabel}>Paket</Text>
          </View>
          <Text style={styles.detailValue}>{vehicle.package}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <MaterialCommunityIcons name="calendar" size={16} color="#666" />
            <Text style={styles.detailLabel}>Yıl</Text>
          </View>
          <Text style={styles.detailValue}>{vehicle.year}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <MaterialCommunityIcons name="gas-station" size={16} color="#666" />
            <Text style={styles.detailLabel}>Yakıt</Text>
          </View>
          <Text style={styles.detailValue}>{vehicle.fuelType}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <MaterialCommunityIcons name="speedometer" size={16} color="#666" />
            <Text style={styles.detailLabel}>Kilometre</Text>
          </View>
          <Text style={styles.detailValue}>{vehicle.mileage.toLocaleString('tr-TR')} km</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <MaterialCommunityIcons name="car-shift-pattern" size={16} color="#666" />
            <Text style={styles.detailLabel}>Vites</Text>
          </View>
          <Text style={styles.detailValue}>{vehicle.transmission}</Text>
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
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex:1}}>
      <Background>
        <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom: 100}} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <BackButton />
              <Text style={styles.title}>Garajım</Text>
              <View style={{ width: 40 }} />
            </View>
            <TouchableOpacity
              style={[styles.addButton, !token && styles.disabledButton]}
              onPress={() => setShowAddModal(true)}
              disabled={!token}
            >
              <MaterialCommunityIcons name="plus" size={24} color={token ? "#fff" : "#ccc"} />
              <Text style={[styles.addButtonText, !token && styles.disabledButtonText]}>Yeni Araç Ekle</Text>
            </TouchableOpacity>
          </View>

          {vehicles.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="car-off" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>
                {!token ? 'Oturum açmanız gerekiyor.' : 'Henüz araç eklenmemiş.'}
                {token && '\nYeni bir araç eklemek için "Araç Ekle" butonuna tıklayın.'}
              </Text>
            </View>
          ) : (
            <View style={styles.vehiclesContainer}>
              {vehicles.map(renderVehicleCard)}
            </View>
          )}

          {/* Araç Ekleme Modal */}
          <Modal
            visible={showAddModal}
            animationType="slide"
            transparent={true}
            onRequestClose={handleCloseModal}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                  >
                    <View style={styles.modalContainer}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Yeni Araç Ekle</Text>
                        <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                          <MaterialCommunityIcons name="close" size={24} color="#1a1a1a" />
                        </TouchableOpacity>
                      </View>

                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressStep}>
                    <View style={[styles.progressDot, formData.brand && styles.progressDotActive]}>
                      <Text style={[styles.progressDotText, formData.brand && styles.progressDotTextActive]}>1</Text>
                    </View>
                    <Text style={[styles.progressLabel, formData.brand && styles.progressLabelActive]}>Marka</Text>
                  </View>
                  <View style={[styles.progressLine, formData.brand && styles.progressLineActive]} />
                  <View style={styles.progressStep}>
                    <View style={[styles.progressDot, formData.model && styles.progressDotActive]}>
                      <Text style={[styles.progressDotText, formData.model && styles.progressDotTextActive]}>2</Text>
                    </View>
                    <Text style={[styles.progressLabel, formData.model && styles.progressLabelActive]}>Model</Text>
                  </View>
                  <View style={[styles.progressLine, formData.model && styles.progressLineActive]} />
                  <View style={styles.progressStep}>
                    <View style={[styles.progressDot, formData.package && formData.fuelType && formData.transmission && styles.progressDotActive]}>
                      <Text style={[styles.progressDotText, formData.package && formData.fuelType && formData.transmission && styles.progressDotTextActive]}>3</Text>
                    </View>
                    <Text style={[styles.progressLabel, formData.package && formData.fuelType && formData.transmission && styles.progressLabelActive]}>Özellikler</Text>
                  </View>
                  <View style={[styles.progressLine, formData.package && formData.fuelType && formData.transmission && styles.progressLineActive]} />
                  <View style={styles.progressStep}>
                    <View style={[styles.progressDot, formData.year && formData.plateNumber && styles.progressDotActive]}>
                      <Text style={[styles.progressDotText, formData.year && formData.plateNumber && styles.progressDotTextActive]}>4</Text>
                    </View>
                    <Text style={[styles.progressLabel, formData.year && formData.plateNumber && styles.progressLabelActive]}>Detay</Text>
                  </View>
                </View>
                
                <ScrollView 
                  ref={scrollViewRef}
                  style={styles.modalContent} 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Marka Seçimi */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.inputLabel}>Marka</Text>
                      {formData.brand && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                    </View>
                    <View style={styles.searchInputContainer}>
                      <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Marka ara (örn: Ford, Audi)"
                        placeholderTextColor="#999"
                        value={brandSearch}
                        onChangeText={setBrandSearch}
                        autoCapitalize="none"
                      />
                      {brandSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setBrandSearch('')}>
                          <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                      )}
                    </View>
                    {formData.brand && (
                      <View style={styles.selectedValueContainer}>
                        <Text style={styles.selectedValueLabel}>Seçilen:</Text>
                        <Text style={styles.selectedValue}>{formData.brand}</Text>
                      </View>
                    )}
                    <ScrollView 
                      style={styles.pickerScrollContainer} 
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.pickerContainer}>
                        {filteredBrands.length > 0 ? (
                          filteredBrands.map((brand, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.pickerItem,
                                formData.brand === brand.brand && styles.pickerItemSelected
                              ]}
                              onPress={() => {
                                handleBrandChange(brand.brand);
                                setBrandSearch('');
                              }}
                            >
                              <Text style={[
                                styles.pickerItemText,
                                formData.brand === brand.brand && styles.pickerItemTextSelected
                              ]}>
                                {brand.brand}
                              </Text>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={styles.noResultText}>Sonuç bulunamadı</Text>
                        )}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Model Seçimi */}
                  {formData.brand && (
                    <View style={styles.inputGroup}>
                      <View style={styles.labelContainer}>
                        <Text style={styles.inputLabel}>Model</Text>
                        {formData.model && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                      </View>
                      <View style={styles.searchInputContainer}>
                        <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Model ara (örn: Focus, Corolla)"
                          placeholderTextColor="#999"
                          value={modelSearch}
                          onChangeText={setModelSearch}
                          autoCapitalize="none"
                        />
                        {modelSearch.length > 0 && (
                          <TouchableOpacity onPress={() => setModelSearch('')}>
                            <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
                          </TouchableOpacity>
                        )}
                      </View>
                      {formData.model && (
                        <View style={styles.selectedValueContainer}>
                          <Text style={styles.selectedValueLabel}>Seçilen:</Text>
                          <Text style={styles.selectedValue}>{formData.model}</Text>
                        </View>
                      )}
                      <ScrollView 
                        style={styles.pickerScrollContainer} 
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={false}
                      >
                        <View style={styles.pickerContainer}>
                          {filteredModels.length > 0 ? (
                            filteredModels.map((model, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.pickerItem,
                                  formData.model === model.name && styles.pickerItemSelected
                                ]}
                                onPress={() => {
                                  handleModelChange(model.name);
                                  setModelSearch('');
                                }}
                              >
                                <Text style={[
                                  styles.pickerItemText,
                                  formData.model === model.name && styles.pickerItemTextSelected
                                ]}>
                                  {model.name}
                                </Text>
                              </TouchableOpacity>
                            ))
                          ) : (
                            <Text style={styles.noResultText}>Sonuç bulunamadı</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Paket, Yakıt ve Vites */}
                  {formData.model && (
                    <>
                      <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>Paket</Text>
                          {formData.package && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                        </View>
                        {formData.package && (
                          <View style={styles.selectedValueContainer}>
                            <Text style={styles.selectedValueLabel}>Seçilen:</Text>
                            <Text style={styles.selectedValue}>{formData.package}</Text>
                          </View>
                        )}
                        <ScrollView 
                          style={styles.pickerScrollContainer} 
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={false}
                        >
                          <View style={styles.pickerContainer}>
                            {availablePackages.map((packageName, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.pickerItem,
                                  formData.package === packageName && styles.pickerItemSelected
                                ]}
                                onPress={() => handlePackageChange(packageName)}
                              >
                                <Text style={[
                                  styles.pickerItemText,
                                  formData.package === packageName && styles.pickerItemTextSelected
                                ]}>
                                  {packageName}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      </View>

                      <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>Yakıt Türü</Text>
                          {formData.fuelType && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                        </View>
                        {formData.fuelType && (
                          <View style={styles.selectedValueContainer}>
                            <Text style={styles.selectedValueLabel}>Seçilen:</Text>
                            <Text style={styles.selectedValue}>{formData.fuelType}</Text>
                          </View>
                        )}
                        <View style={styles.pickerContainer}>
                          {availableFuelTypes.map((fuelType, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.pickerItem,
                                formData.fuelType === fuelType && styles.pickerItemSelected
                              ]}
                              onPress={() => handleFuelTypeChange(fuelType)}
                            >
                              <Text style={[
                                styles.pickerItemText,
                                formData.fuelType === fuelType && styles.pickerItemTextSelected
                              ]}>
                                {fuelType}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                          <Text style={styles.inputLabel}>Vites Türü</Text>
                          {formData.transmission && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                        </View>
                        {formData.transmission && (
                          <View style={styles.selectedValueContainer}>
                            <Text style={styles.selectedValueLabel}>Seçilen:</Text>
                            <Text style={styles.selectedValue}>{formData.transmission}</Text>
                          </View>
                        )}
                        <View style={styles.pickerContainer}>
                          {availableTransmissions.map((transmission, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.pickerItem,
                                formData.transmission === transmission && styles.pickerItemSelected
                              ]}
                              onPress={() => handleTransmissionChange(transmission)}
                            >
                              <Text style={[
                                styles.pickerItemText,
                                formData.transmission === transmission && styles.pickerItemTextSelected
                              ]}>
                                {transmission}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </>
                  )}

                  {/* Yıl, Kilometre, Plaka */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.inputLabel}>Yıl</Text>
                      {formData.year && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="2024"
                      placeholderTextColor="#999"
                      value={formData.year}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, year: text }))}
                      keyboardType="numeric"
                      maxLength={4}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.inputLabel}>Kilometre (İsteğe bağlı)</Text>
                      {formData.mileage && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="150000"
                      placeholderTextColor="#999"
                      value={formData.mileage}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, mileage: text }))}
                      keyboardType="numeric"
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.inputLabel}>Plaka Numarası</Text>
                      {formData.plateNumber && <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />}
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="34ABC123"
                      placeholderTextColor="#999"
                      value={formData.plateNumber}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, plateNumber: text.toUpperCase() }))}
                      autoCapitalize="characters"
                      maxLength={9}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleAddVehicle}>
                    <Text style={styles.saveButtonText}>Araç Ekle</Text>
                  </TouchableOpacity>
                </View>
                    </View>
                  </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyStateText: {
    marginTop: 20,
    fontSize: 17,
    color: '#f5f7fa',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
  vehiclesContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  carIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e8f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTitle: {
    flex: 1,
    marginLeft: 14,
  },
  vehicleBrand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  vehicleModel: {
    fontSize: 16,
    color: '#666',
    marginTop: 3,
    fontWeight: '500',
  },
  vehiclePlate: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#fff0f0',
    borderRadius: 12,
  },
  vehicleDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 18,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  favoriteButton: {
    marginHorizontal: 10,
    backgroundColor: '#fff9e6',
    padding: 10,
    borderRadius: 12,
  },
  favoriteCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#fffef8',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowColor: '#ccc',
  },
  disabledButtonText: {
    color: '#999',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    minHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf0',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8ecf0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
  },
  progressDotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  progressLabelActive: {
    color: '#007AFF',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e8ecf0',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#007AFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  selectedValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectedValueLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },
  selectedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e8ecf0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fafbfc',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  pickerScrollContainer: {
    maxHeight: 140,
    marginBottom: 8,
  },
  noResultText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  pickerItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  pickerItemTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e8ecf0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fafbfc',
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    minHeight: 52,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
});

export default GarageScreen;