import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';
import LocationService, { UserLocation } from '@/shared/services/locationService'; // Çekici hizmetleri için geri eklendi

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

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

export const useFaultReport = () => {
  const { token } = useAuth();
  const navigation = useNavigation();
  
  // Form state
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  
  // Data state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Priority levels - static data
  const priorityLevels = [
    { id: 'low', name: 'Düşük', color: '#34C759', icon: 'arrow-down', description: 'Acil değil, zamanında yapılabilir' },
    { id: 'medium', name: 'Orta', color: '#FF9500', icon: 'arrow-up', description: 'Normal sürede yapılmalı' },
    { id: 'high', name: 'Yüksek', color: '#FF3B30', icon: 'arrow-up', description: 'Öncelikli olarak yapılmalı' },
    { id: 'urgent', name: 'Acil', color: '#FF0000', icon: 'alert-circle', description: 'Hemen müdahale gerekiyor' },
  ];
  
  // Location state - sadece çekici hizmetleri için kullanılır
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');

  // 5 ana hizmet türü - tüm hizmetler bu 5 kategoriye bölünür
  const staticServiceCategories = [
    { 
      id: 'Kaporta/Boya', 
      name: 'Kaporta/Boya', 
      icon: 'car-wrench', 
      color: '#FF6B35',
      description: 'Kaporta ve boya hizmetleri'
    },
    { 
      id: 'Tamir ve Bakım', 
      name: 'Tamir ve Bakım', 
      icon: 'wrench', 
      color: '#007AFF',
      description: 'Genel bakım, ağır bakım, alt/üst takım, elektrik-elektronik, yedek parça, egzoz & emisyon'
    },
    { 
      id: 'Araç Yıkama', 
      name: 'Araç Yıkama', 
      icon: 'car-wash', 
      color: '#5AC8FA',
      description: 'Araç yıkama hizmetleri'
    },
    { 
      id: 'Lastik', 
      name: 'Lastik', 
      icon: 'tire', 
      color: '#FF9500',
      description: 'Lastik değişimi, balans, rot ayarı'
    },
    { 
      id: 'Çekici', 
      name: 'Çekici', 
      icon: 'car', 
      color: '#FF3B30',
      description: 'Araç çekme hizmetleri'
    },
  ];

  // Load initial data
  useEffect(() => {
    loadVehicles();
    loadUserLocation(); // Çekici hizmetleri için geri eklendi
    setServiceCategories(staticServiceCategories);
  }, []);

  const loadVehicles = async () => {
    const { data, error } = await withErrorHandling(
      () => apiService.getVehicles(),
      { showErrorAlert: false }
    );

    if (data && data.success) {
      const vehicleList = Array.isArray(data.data) ? data.data : (data.data?.vehicles || []);
      setVehicles(vehicleList);
    }
  };


  const loadUserLocation = async () => {
    setLocationLoading(true);
    try {
      const locationService = LocationService.getInstance();
      const userLocation = await locationService.getCurrentLocation();
      
      if (userLocation) {
        setLocation(userLocation);
        // Adres bilgisini reverse geocoding ile al
        await reverseGeocode(userLocation);
      }
    } catch (error) {
      console.log('Konum alınamadı:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const reverseGeocode = async (location: UserLocation) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&addressdetails=1&accept-language=tr`
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || `${location.latitude}, ${location.longitude}`;
        setLocationAddress(address);
      }
    } catch (error) {
      console.log('Adres bilgisi alınamadı:', error);
      setLocationAddress(`${location.latitude}, ${location.longitude}`);
    }
  };

  const addPhoto = (photoUri: string) => {
    if (photos.length >= 5) {
      Alert.alert('Uyarı', 'En fazla 5 fotoğraf ekleyebilirsiniz.');
      return;
    }
    setPhotos([...photos, photoUri]);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  const addVideo = (videoUri: string) => {
    if (videos.length >= 2) {
      Alert.alert('Uyarı', 'En fazla 2 video ekleyebilirsiniz.');
      return;
    }
    setVideos([...videos, videoUri]);
  };

  const removeVideo = (index: number) => {
    const newVideos = videos.filter((_, i) => i !== index);
    setVideos(newVideos);
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (!selectedVehicle) {
          Alert.alert('Uyarı', 'Lütfen bir araç seçin.');
          return false;
        }
        return true;
      
      case 2:
        if (!selectedServiceCategory) {
          Alert.alert('Uyarı', 'Lütfen bir hizmet kategorisi seçin.');
          return false;
        }
        return true;
      
      case 3:
        if (!faultDescription.trim()) {
          Alert.alert('Uyarı', 'Lütfen arıza açıklaması girin.');
          return false;
        }
        if (faultDescription.trim().length < 10) {
          Alert.alert('Uyarı', 'Arıza açıklaması en az 10 karakter olmalıdır.');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      if (step === 5) {
        // Son adımda submitReport çağır
        submitReport();
      } else {
        setStep(step + 1);
      }
    }
  };

  const previousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const submitReport = async () => {
    if (!validateStep(3)) return;

    // Çekici hizmeti için konum zorunlu
    const isLocationRequired = selectedServiceCategory === 'Çekici';
    
    if (isLocationRequired && !location) {
      Alert.alert(
        'Konum Gerekli', 
        'Çekici hizmeti için konum bilgisi gereklidir. Lütfen konum erişimine izin verin.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Konum Ver', onPress: loadUserLocation }
        ]
      );
      return;
    }

    setSubmitting(true);
    
    try {
      const selectedVehicleData = vehicles.find(v => v._id === selectedVehicle);
      const selectedCategoryData = serviceCategories.find(c => c.id === selectedServiceCategory);

      const faultReportData = {
        vehicleId: selectedVehicle,
        serviceCategory: selectedServiceCategory,
        faultDescription: faultDescription, // Backend faultDescription bekliyor
        priority,
        // Konum sadece çekici hizmeti için gönder
        ...(location && selectedServiceCategory === 'Çekici' && {
          location: {
            coordinates: [location.longitude, location.latitude], // Backend GeoJSON format bekliyor
            address: locationAddress,
            city: locationAddress.split(',')[locationAddress.split(',').length - 1]?.trim() || 'İstanbul'
          }
        }),
        photos,
        videos,
        vehicleInfo: selectedVehicleData ? {
          brand: selectedVehicleData.brand,
          model: selectedVehicleData.modelName,
          year: selectedVehicleData.year,
          plateNumber: selectedVehicleData.plateNumber
        } : null
      };

      const { data, error } = await withErrorHandling(
        () => apiService.createFaultReport(faultReportData),
        { customErrorMessage: 'Arıza bildirimi gönderilirken bir hata oluştu.' }
      );

      if (data && data.success) {
        Alert.alert(
          'Başarılı',
          'Arıza bildiriminiz başarıyla gönderildi. Ustalardan teklifler almaya başlayacaksınız.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Reset form
                resetForm();
                // Navigate back to home screen
                navigation.goBack();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Fault report submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedVehicle('');
    setSelectedServiceCategory('');
    setFaultDescription('');
    setPhotos([]);
    setVideos([]);
    setPriority('medium');
    setLocation(null); // Çekici hizmetleri için geri eklendi
    setLocationAddress(''); // Çekici hizmetleri için geri eklendi
  };

  return {
    // Form state
    step,
    selectedVehicle,
    selectedServiceCategory,
    faultDescription,
    photos,
    videos,
    priority,
    
    // Data state
    vehicles,
    serviceCategories,
    priorityLevels,
    loading,
    submitting,
    
    // Location state - sadece çekici hizmetleri için kullanılır
    location,
    locationLoading,
    locationAddress,
    
    // Actions
    setSelectedVehicle,
    setSelectedServiceCategory,
    setFaultDescription,
    setPriority,
    addPhoto,
    removePhoto,
    addVideo,
    removeVideo,
    nextStep,
    previousStep,
    submitReport,
    resetForm,
    loadUserLocation, // Çekici hizmetleri için geri eklendi
    validateStep,
  };
};
