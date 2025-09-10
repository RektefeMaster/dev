import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
// Video picker için expo-image-picker kullanacağız
import axios from 'axios';
import { API_URL } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import LocationService, { UserLocation } from '../services/locationService';

type RootStackParamList = {
  Home: undefined;
  FaultReport: undefined;
  Main: { screen?: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const FaultReportScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { token } = useAuth();
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [currentLocation, setCurrentLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Hizmet kategorileri
  const serviceCategories = [
    { id: 'Ağır Bakım', name: 'Ağır Bakım', icon: 'wrench', color: theme.colors.primary.main },
    { id: 'Üst Takım', name: 'Üst Takım', icon: 'cog', color: theme.colors.warning.main },
    { id: 'Alt Takım', name: 'Alt Takım', icon: 'cog', color: theme.colors.secondary.main },
    { id: 'Kaporta/Boya', name: 'Kaporta/Boya', icon: 'spray', color: theme.colors.error.main },
    { id: 'Elektrik-Elektronik', name: 'Elektrik-Elektronik', icon: 'lightning-bolt', color: theme.colors.warning.main },
    { id: 'Yedek Parça', name: 'Yedek Parça', icon: 'car-wash', color: theme.colors.secondary.main },
    { id: 'Lastik', name: 'Lastik', icon: 'tire', color: theme.colors.primary.main },
    { id: 'Egzoz & Emisyon', name: 'Egzoz & Emisyon', icon: 'smoke', color: theme.colors.error.main },
    { id: 'Ekspertiz', name: 'Ekspertiz', icon: 'magnify', color: theme.colors.warning.main },
    { id: 'Sigorta & Kasko', name: 'Sigorta & Kasko', icon: 'shield-check', color: theme.colors.success.main },
    { id: 'Araç Yıkama', name: 'Araç Yıkama', icon: 'car-wash', color: theme.colors.primary.main },
    { id: 'Genel Bakım', name: 'Genel Bakım', icon: 'tools', color: theme.colors.success.main },
  ];

  // Öncelik seviyeleri
  const priorityLevels = [
    { id: 'low', name: 'Düşük', color: theme.colors.success.main, icon: 'arrow-down' },
    { id: 'medium', name: 'Orta', color: theme.colors.warning.main, icon: 'arrow-up' },
    { id: 'high', name: 'Yüksek', color: theme.colors.error.main, icon: 'arrow-up' },
    { id: 'urgent', name: 'Acil', color: '#FF0000', icon: 'alert-circle' },
  ];

  // Ekrana her girildiğinde state'leri sıfırla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setStep(1);
      setSelectedVehicle('');
      setSelectedServiceCategory('');
      setFaultDescription('');
      setPhotos([]);
      setVideos([]);
      setPriority('medium');
    });
    return unsubscribe;
  }, [navigation]);

  // Kullanıcı ID'sini al
  useEffect(() => {
    const getUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('user_id');
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error('userId alınırken hata:', error);
      }
    };
    getUserId();
  }, []);

  // Araçları getir
  useEffect(() => {
    if (userId) {
      const fetchVehicles = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`${API_URL}/vehicles`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.data && response.data.success && response.data.data) {
            setVehicles(response.data.data);
          } else {
            setVehicles([]);
          }
        } catch (error) {
          console.error('Araçlar yüklenirken hata:', error);
          setVehicles([]);
          Alert.alert('Hata', 'Araçlar yüklenirken bir hata oluştu');
        } finally {
          setLoading(false);
        }
      };
      fetchVehicles();
    }
  }, [userId, token]);

  // Konum bilgisini al
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const locationService = LocationService.getInstance();
      const location = await locationService.getCurrentLocation();
      
      if (location) {
        setCurrentLocation(location);
        console.log('📍 Konum alındı:', location);
      } else {
        Alert.alert(
          'Konum Alınamadı',
          'Konum bilgisi alınamadı. Yakındaki ustaları bulmak için konum izni gerekli.',
          [
            { text: 'Tekrar Dene', onPress: getCurrentLocation },
            { text: 'Devam Et', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Konum alma hatası:', error);
      Alert.alert('Hata', 'Konum bilgisi alınamadı');
    } finally {
      setLocationLoading(false);
    }
  };

  // Sayfa yüklendiğinde konum al
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Fotoğraf seç
  const pickImage = async () => {
    if (photos.length >= 3) {
      Alert.alert('Uyarı', 'En fazla 3 fotoğraf yükleyebilirsiniz');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Cloudinary'ye yükle
      try {
        const formData = new FormData();
        formData.append('image', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any);

        const uploadResponse = await axios.post(`${API_URL}/upload?type=fault_report`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadResponse.data && uploadResponse.data.url) {
          setPhotos([...photos, uploadResponse.data.url]);
        }
      } catch (error) {
        console.error('Fotoğraf yükleme hatası:', error);
        Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu');
      }
    }
  };

  // Video seç
  const pickVideo = async () => {
    if (videos.length >= 1) {
      Alert.alert('Uyarı', 'En fazla 1 video yükleyebilirsiniz');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Cloudinary'ye yükle
      try {
        const formData = new FormData();
        formData.append('image', {
          uri: result.assets[0].uri,
          type: 'video/mp4',
          name: 'video.mp4',
        } as any);

        const uploadResponse = await axios.post(`${API_URL}/upload?type=fault_report`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadResponse.data && uploadResponse.data.url) {
          setVideos([...videos, uploadResponse.data.url]);
        }
      } catch (error) {
        console.error('Video yükleme hatası:', error);
        Alert.alert('Hata', 'Video yüklenirken bir hata oluştu');
      }
    }
  };

  // Fotoğraf sil
  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Video sil
  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  // Hizmet kategorisini 4 ana kategoriye eşleştir
  const mapToMainCategory = (category: string): string => {
    const categoryMapping: { [key: string]: string } = {
      'Ağır Bakım': 'repair',
      'Üst Takım': 'repair',
      'Alt Takım': 'repair',
      'Kaporta/Boya': 'repair',
      'Elektrik-Elektronik': 'repair',
      'Yedek Parça': 'repair',
      'Egzoz & Emisyon': 'repair',
      'Ekspertiz': 'repair',
      'Sigorta & Kasko': 'repair',
      'Genel Bakım': 'repair',
      'Lastik': 'tire',
      'Araç Yıkama': 'wash',
      'Çekici': 'towing'
    };
    return categoryMapping[category] || 'repair';
  };

  // Arıza bildirimi oluştur
  const createFaultReport = async () => {
    setLoading(true);
    try {
      const mainCategory = mapToMainCategory(selectedServiceCategory);
      
      const faultReportData = {
        vehicleId: selectedVehicle,
        serviceCategory: selectedServiceCategory, // Detaylı kategori (Alt Takım, Üst Takım vs.)
        mainServiceCategory: mainCategory, // Ana kategori (repair, wash, tire, towing)
        faultDescription,
        photos,
        videos,
        priority,
        location: currentLocation ? {
          coordinates: [currentLocation.longitude, currentLocation.latitude],
          address: '', // Adres bilgisi şimdilik boş
          city: '',
          district: '',
          neighborhood: ''
        } : undefined,
      };

      const response = await axios.post(
        `${API_URL}/fault-reports`,
        faultReportData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data && response.data.success) {
        Alert.alert(
          'Arıza Bildirimi Başarıyla Oluşturuldu!',
          `Arızanız ${response.data.data.nearbyMechanicsCount} ustaya gönderildi. Fiyat teklifleri gelmeye başlayacak.`,
          [
            {
              text: 'Ana Sayfaya Git',
              onPress: () => {
                navigation.navigate('Main', { screen: 'MainTabs' });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Arıza bildirimi oluşturma hatası:', error);
      const errorMessage = error.response?.data?.message || 'Arıza bildirimi oluşturulurken bir hata oluştu';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedVehicle) {
      Alert.alert('Uyarı', 'Lütfen bir araç seçin');
      return;
    }
    if (step === 2 && !selectedServiceCategory) {
      Alert.alert('Uyarı', 'Lütfen bir hizmet kategorisi seçin');
      return;
    }
    if (step === 3 && !faultDescription.trim()) {
      Alert.alert('Uyarı', 'Lütfen arıza açıklaması yazın');
      return;
    }
    if (step === 4) {
      createFaultReport();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: 'Araç Seç', icon: 'car-outline' },
      { number: 2, title: 'Hizmet', icon: 'build-outline' },
      { number: 3, title: 'Detay', icon: 'document-text-outline' },
      { number: 4, title: 'Öncelik', icon: 'flag-outline' }
    ];

    return (
      <View style={styles.stepIndicatorContainer}>
        {steps.map((stepItem, index) => (
          <View key={stepItem.number} style={styles.stepIndicatorWrapper}>
            <View
              style={[
                styles.stepIndicator,
                { backgroundColor: theme.colors.background.secondary },
                stepItem.number === step && styles.stepIndicatorActive,
                stepItem.number < step && styles.stepIndicatorCompleted,
              ]}
            >
              {stepItem.number < step ? (
                <Ionicons name="checkmark" size={18} color="#fff" />
              ) : (
                <Ionicons 
                  name={stepItem.icon as any} 
                  size={18} 
                  color={stepItem.number === step ? '#fff' : theme.colors.text.secondary} 
                />
              )}
            </View>
            <Text style={[
              styles.stepTitle,
              { color: theme.colors.text.secondary },
              stepItem.number === step && { color: theme.colors.primary.main, fontWeight: '600' },
              stepItem.number < step && { color: theme.colors.success.main }
            ]}>
              {stepItem.title}
            </Text>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepIndicatorLine,
                  { backgroundColor: theme.colors.border.primary },
                  stepItem.number < step && styles.stepIndicatorLineCompleted,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconContainer, { backgroundColor: theme.colors.primary.light }]}>
                <Ionicons name="car-outline" size={28} color={theme.colors.primary.main} />
              </View>
              <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>Aracınızı Seçin</Text>
              <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
                Arıza bildirimi yapmak istediğiniz aracı seçin
              </Text>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.main} />
                <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
                  Araçlarınız yükleniyor...
                </Text>
              </View>
            ) : vehicles.length > 0 ? (
              <ScrollView style={styles.vehiclesList} showsVerticalScrollIndicator={false}>
                {vehicles.map((vehicle: any) => (
                  <TouchableOpacity
                    key={vehicle._id}
                    style={[
                      styles.vehicleCard,
                      { 
                        backgroundColor: theme.colors.background.card, 
                        borderColor: theme.colors.border.primary,
                        shadowColor: theme.colors.shadow.primary,
                      },
                      selectedVehicle === vehicle._id && styles.vehicleCardSelected,
                    ]}
                    onPress={() => setSelectedVehicle(vehicle._id)}
                  >
                    <View style={styles.vehicleIconContainer}>
                      <Ionicons 
                        name="car" 
                        size={24} 
                        color={selectedVehicle === vehicle._id ? '#fff' : theme.colors.primary.main} 
                      />
                    </View>
                    <View style={styles.vehicleInfo}>
                      <Text style={[
                        styles.vehicleName, 
                        { color: selectedVehicle === vehicle._id ? '#fff' : theme.colors.text.primary }
                      ]}>
                        {vehicle.brand} {vehicle.modelName}
                      </Text>
                      <Text style={[
                        styles.vehicleDetails, 
                        { color: selectedVehicle === vehicle._id ? 'rgba(255,255,255,0.8)' : theme.colors.text.secondary }
                      ]}>
                        {vehicle.year} • {vehicle.plateNumber}
                      </Text>
                    </View>
                    {selectedVehicle === vehicle._id && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyStateIcon, { backgroundColor: theme.colors.background.secondary }]}>
                  <Ionicons name="car-outline" size={48} color={theme.colors.text.tertiary} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: theme.colors.text.primary }]}>
                  Henüz araç eklenmemiş
                </Text>
                <Text style={[styles.emptyStateText, { color: theme.colors.text.secondary }]}>
                  Önce garajınıza araç eklemeniz gerekiyor
                </Text>
                <TouchableOpacity 
                  style={[styles.addVehicleButton, { backgroundColor: theme.colors.primary.main }]}
                  onPress={() => navigation.navigate('Main', { screen: 'Garage' })}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addVehicleButtonText}>Araç Ekle</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconContainer, { backgroundColor: theme.colors.primary.light }]}>
                <Ionicons name="build-outline" size={28} color={theme.colors.primary.main} />
              </View>
              <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>Hizmet Kategorisi Seçin</Text>
              <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
                Arızanızın hangi kategoriye girdiğini seçin
              </Text>
            </View>
            
            <View style={styles.categoriesGrid}>
              {serviceCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    { 
                      backgroundColor: theme.colors.background.card, 
                      borderColor: theme.colors.border.primary,
                      shadowColor: theme.colors.shadow.primary,
                    },
                    selectedServiceCategory === category.id && styles.categoryCardSelected,
                  ]}
                  onPress={() => setSelectedServiceCategory(category.id)}
                >
                  <View style={[
                    styles.categoryIconContainer,
                    { backgroundColor: selectedServiceCategory === category.id ? 'rgba(255,255,255,0.2)' : category.color + '20' }
                  ]}>
                    <MaterialCommunityIcons
                      name={category.icon as any}
                      size={28}
                      color={selectedServiceCategory === category.id ? '#fff' : category.color}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryName,
                      { color: selectedServiceCategory === category.id ? '#fff' : theme.colors.text.primary },
                    ]}
                  >
                    {category.name}
                  </Text>
                  {selectedServiceCategory === category.id && (
                    <View style={styles.categorySelectedIndicator}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconContainer, { backgroundColor: theme.colors.primary.light }]}>
                <Ionicons name="document-text-outline" size={28} color={theme.colors.primary.main} />
              </View>
              <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>Arıza Açıklaması</Text>
              <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
                Aracınızdaki arızayı detaylı şekilde açıklayın
              </Text>
            </View>
            
            <View style={styles.descriptionContainer}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="create-outline" size={20} color={theme.colors.text.secondary} />
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  Arıza Detayları
                </Text>
              </View>
              <TextInput
                style={[
                  styles.descriptionInput,
                  { 
                    backgroundColor: theme.colors.background.card, 
                    borderColor: theme.colors.border.primary,
                    color: theme.colors.text.primary,
                    shadowColor: theme.colors.shadow.primary,
                  }
                ]}
                placeholder="Arıza açıklaması yazın... (örn: Motor çalışmıyor, frenler tutmuyor, klima çalışmıyor)"
                placeholderTextColor={theme.colors.text.secondary}
                value={faultDescription}
                onChangeText={setFaultDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={[styles.characterCount, { color: theme.colors.text.tertiary }]}>
                {faultDescription.length}/500 karakter
              </Text>
            </View>

            <View style={styles.mediaContainer}>
              <View style={styles.mediaTitleContainer}>
                <Ionicons name="images-outline" size={24} color={theme.colors.primary.main} />
                <Text style={[styles.mediaTitle, { color: theme.colors.text.primary }]}>Fotoğraf ve Video</Text>
              </View>
              <Text style={[styles.mediaSubtitle, { color: theme.colors.text.secondary }]}>
                Arızanızı daha iyi anlatmak için görsel ekleyin
              </Text>
              
              {/* Fotoğraflar */}
              <View style={styles.mediaSection}>
                <View style={styles.mediaHeader}>
                  <View style={styles.mediaLabelContainer}>
                    <Ionicons name="camera-outline" size={18} color={theme.colors.text.secondary} />
                    <Text style={[styles.mediaLabel, { color: theme.colors.text.secondary }]}>
                      Fotoğraflar ({photos.length}/3)
                    </Text>
                  </View>
                  {photos.length < 3 && (
                    <TouchableOpacity 
                      style={[styles.addButton, { backgroundColor: theme.colors.primary.main }]} 
                      onPress={pickImage}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScrollView}>
                  {photos.map((photo, index) => (
                    <View key={index} style={styles.mediaItem}>
                      <Image source={{ uri: photo }} style={styles.mediaImage} />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removePhoto(index)}
                      >
                        <Ionicons name="close-circle" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {photos.length < 3 && (
                    <TouchableOpacity 
                      style={[styles.addMediaButton, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }]}
                      onPress={pickImage}
                    >
                      <Ionicons name="camera" size={24} color={theme.colors.text.secondary} />
                      <Text style={[styles.addMediaText, { color: theme.colors.text.secondary }]}>Fotoğraf Ekle</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>

              {/* Videolar */}
              <View style={styles.mediaSection}>
                <View style={styles.mediaHeader}>
                  <View style={styles.mediaLabelContainer}>
                    <Ionicons name="videocam-outline" size={18} color={theme.colors.text.secondary} />
                    <Text style={[styles.mediaLabel, { color: theme.colors.text.secondary }]}>
                      Videolar ({videos.length}/1)
                    </Text>
                  </View>
                  {videos.length < 1 && (
                    <TouchableOpacity 
                      style={[styles.addButton, { backgroundColor: theme.colors.primary.main }]} 
                      onPress={pickVideo}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScrollView}>
                  {videos.map((video, index) => (
                    <View key={index} style={styles.mediaItem}>
                      <View style={[styles.videoPlaceholder, { backgroundColor: theme.colors.background.secondary }]}>
                        <Ionicons name="play-circle" size={32} color={theme.colors.primary.main} />
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeVideo(index)}
                      >
                        <Ionicons name="close-circle" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {videos.length < 1 && (
                    <TouchableOpacity 
                      style={[styles.addMediaButton, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }]}
                      onPress={pickVideo}
                    >
                      <Ionicons name="videocam" size={24} color={theme.colors.text.secondary} />
                      <Text style={[styles.addMediaText, { color: theme.colors.text.secondary }]}>Video Ekle</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </View>

            {/* Öncelik Seviyesi */}
            <View style={styles.priorityContainer}>
              <View style={styles.priorityTitleContainer}>
                <Ionicons name="flag-outline" size={24} color={theme.colors.primary.main} />
                <Text style={[styles.priorityTitle, { color: theme.colors.text.primary }]}>Öncelik Seviyesi</Text>
              </View>
              <Text style={[styles.prioritySubtitle, { color: theme.colors.text.secondary }]}>
                Arızanızın aciliyetini belirtin
              </Text>
              <View style={styles.priorityGrid}>
                {priorityLevels.map((level) => (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.priorityCard,
                      { 
                        backgroundColor: theme.colors.background.card, 
                        borderColor: theme.colors.border.primary,
                        shadowColor: theme.colors.shadow.primary,
                      },
                      priority === level.id && styles.priorityCardSelected,
                    ]}
                    onPress={() => setPriority(level.id as any)}
                  >
                    <View style={[
                      styles.priorityIconContainer,
                      { backgroundColor: priority === level.id ? 'rgba(255,255,255,0.2)' : level.color + '20' }
                    ]}>
                      <Ionicons
                        name={level.icon as any}
                        size={24}
                        color={priority === level.id ? '#fff' : level.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.priorityName,
                        { color: priority === level.id ? '#fff' : theme.colors.text.primary },
                      ]}
                    >
                      {level.name}
                    </Text>
                    {priority === level.id && (
                      <View style={styles.prioritySelectedIndicator}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconContainer, { backgroundColor: theme.colors.primary.light }]}>
                <Ionicons name="checkmark-circle-outline" size={28} color={theme.colors.primary.main} />
              </View>
              <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>Özet</Text>
              <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
                Arıza bildiriminizi kontrol edin
              </Text>
            </View>
            
            <View style={[styles.summaryCard, { 
              backgroundColor: theme.colors.background.card, 
              borderColor: theme.colors.border.primary,
              shadowColor: theme.colors.shadow.primary,
            }]}>
              <View style={styles.summaryHeader}>
                <Ionicons name="document-text" size={24} color={theme.colors.primary.main} />
                <Text style={[styles.summaryTitle, { color: theme.colors.text.primary }]}>Arıza Bildirimi Özeti</Text>
              </View>
              
              <View style={styles.summaryContent}>
                <View style={styles.summaryItem}>
                  <View style={styles.summaryItemHeader}>
                    <Ionicons name="car" size={18} color={theme.colors.text.secondary} />
                    <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Araç</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                    {vehicles.find(v => v._id === selectedVehicle)?.brand} {vehicles.find(v => v._id === selectedVehicle)?.modelName}
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <View style={styles.summaryItemHeader}>
                    <Ionicons name="build" size={18} color={theme.colors.text.secondary} />
                    <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Kategori</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                    {serviceCategories.find(c => c.id === selectedServiceCategory)?.name}
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <View style={styles.summaryItemHeader}>
                    <Ionicons name="document-text" size={18} color={theme.colors.text.secondary} />
                    <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Açıklama</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                    {faultDescription}
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <View style={styles.summaryItemHeader}>
                    <Ionicons name="flag" size={18} color={theme.colors.text.secondary} />
                    <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Öncelik</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                    {priorityLevels.find(p => p.id === priority)?.name}
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <View style={styles.summaryItemHeader}>
                    <Ionicons name="images" size={18} color={theme.colors.text.secondary} />
                    <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Medya</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                    {photos.length} fotoğraf, {videos.length} video
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <View style={styles.summaryItemHeader}>
                    <Ionicons name="location" size={18} color={theme.colors.text.secondary} />
                    <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Konum</Text>
                  </View>
                  <View style={styles.locationContainer}>
                    {locationLoading ? (
                      <View style={styles.locationLoadingContainer}>
                        <ActivityIndicator size="small" color={theme.colors.primary.main} />
                        <Text style={[styles.locationText, { color: theme.colors.text.secondary }]}>Konum alınıyor...</Text>
                      </View>
                    ) : currentLocation ? (
                      <View>
                        <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                          Konum alındı ✓
                        </Text>
                        <Text style={[styles.locationCoords, { color: theme.colors.text.secondary }]}>
                          {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.locationErrorContainer}>
                        <Text style={[styles.summaryValue, { color: theme.colors.error.main }]}>
                          Konum alınamadı
                        </Text>
                        <TouchableOpacity onPress={getCurrentLocation} style={styles.retryLocationButton}>
                          <Ionicons name="refresh" size={16} color={theme.colors.primary.main} />
                          <Text style={[styles.retryLocationText, { color: theme.colors.primary.main }]}>Tekrar Dene</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.colors.background.card, borderBottomColor: theme.colors.border.primary }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary.main} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Arıza Bildir</Text>
        </View>

        {renderStepIndicator()}

        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {renderStep()}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={[styles.footerContainer, { backgroundColor: theme.colors.background.card, borderTopColor: theme.colors.border.primary }]}>
          <View style={styles.footer}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.footerButton, styles.backButton, { borderColor: theme.colors.primary.main }]}
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={20} color={theme.colors.primary.main} />
                <Text style={[styles.footerButtonText, { color: theme.colors.primary.main }]}>
                  Geri
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.footerButton, styles.nextButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.footerButtonText}>
                    {step === 4 ? 'Arıza Bildir' : 'İleri'}
                  </Text>
                  {step < 4 && (
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 16,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  stepIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: '#0066cc',
  },
  stepIndicatorCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepIndicatorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepIndicatorLine: {
    width: 50,
    height: 2,
    backgroundColor: '#e0e0e0',
  },
  stepIndicatorLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    marginBottom: 24,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addVehicleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  vehicleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,102,204,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  selectedIndicator: {
    marginLeft: 'auto',
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  mediaTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mediaSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  mediaLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaScrollView: {
    marginTop: 8,
  },
  addMediaButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addMediaText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  priorityTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  prioritySubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  priorityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  prioritySelectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  summaryContent: {
    gap: 16,
  },
  summaryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehiclesList: {
    maxHeight: 400,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleCardSelected: {
    borderColor: '#0066cc',
    backgroundColor: '#0066cc',
  },
  vehicleInfo: {
    flex: 1,
    marginRight: 10,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  categoryCard: {
    width: (width - 72) / 2,
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  categoryCardSelected: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categorySelectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  categoryName: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  mediaContainer: {
    marginBottom: 24,
  },
  mediaTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  mediaSection: {
    marginBottom: 20,
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaItem: {
    marginRight: 12,
    position: 'relative',
  },
  mediaImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  videoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  priorityContainer: {
    marginBottom: 24,
  },
  priorityTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  priorityCard: {
    width: (width - 72) / 2,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  priorityCardSelected: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  priorityName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    flex: 1,
    textAlign: 'right',
  },
  footerContainer: {
    borderTopWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  nextButton: {
    backgroundColor: '#0066cc',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  locationContainer: {
    flex: 1,
  },
  locationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
  },
  locationCoords: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  locationErrorContainer: {
    flex: 1,
  },
  retryLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  retryLocationText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FaultReportScreen;
