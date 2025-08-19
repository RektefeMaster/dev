import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../constants/config';
import { useAuth } from '../../../context/AuthContext';
import { clearAuthData } from '../../../utils/common';
import { translateServices } from '../../../utils/serviceTranslator';

interface Vehicle {
  _id: string;
  userId: string;
  brand: string;
  model: string;
  package: string;
  year: string;
  fuelType: string;
  mileage: string;
  plateNumber: string;
  isFavorite: boolean;
  createdAt: string;
}

interface MaintenanceRecord {
  date: string;
  mileage: string;
  type: string;
  details: string[];
  serviceName: string;
  cost?: number;
}

interface InsuranceInfo {
  company: string;
  type: string;
  startDate: string;
  endDate: string;
  policyNumber: string;
}

interface VehicleStatus {
  overallStatus: 'İyi' | 'Orta' | 'Dikkat Gerekli';
  lastCheck: string;
  issues: string[];
}

interface ServiceProvider {
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

interface Campaign {
  id: number;
  title: string;
  description: string;
  image: string;
  company: string;
  companyLogo?: string;
  validUntil: string;
  discount: string;
  conditions: string[];
  serviceType: string;
  location: {
    city: string;
    district: string;
  };
  contactInfo: {
    phone: string;
    address: string;
  };
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

interface CampaignAd {
  id: number;
  title: string;
  image: string;
  shortText: string;
  detailText: string;
  company: string;
  companyLogo?: string;
  validUntil?: string;
}

export const useHomeData = () => {
  const [userName, setUserName] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');
  const [favoriteCar, setFavoriteCar] = useState<Vehicle | null>(null);
  const [maintenanceRecord, setMaintenanceRecord] = useState<MaintenanceRecord | null>(null);
  const [insuranceInfo, setInsuranceInfo] = useState<InsuranceInfo | null>(null);
  const [vehicleStatus, setVehicleStatus] = useState<VehicleStatus | null>(null);
  const [serviceProviders, setServiceProviders] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ads, setAds] = useState<CampaignAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tireStatus, setTireStatus] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  
  const { token, userId, isAuthenticated, setToken, setUserId } = useAuth();

  // Saat dilimine göre selamlama fonksiyonu
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'Günaydın';
    } else if (hour >= 12 && hour < 16) {
      return 'İyi Öğlenler';
    } else if (hour >= 16 && hour < 22) {
      return 'İyi Akşamlar';
    } else {
      return 'İyi Geceler';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      console.log('🔍 useHomeData: useEffect çalıştı');
      console.log('🔍 useHomeData: Token:', token ? 'Mevcut' : 'Yok');
      console.log('🔍 useHomeData: UserID:', userId ? 'Mevcut' : 'Yok');
      console.log('🔍 useHomeData: isAuthenticated:', isAuthenticated);
      
      // Selamlamayı güncelle
      setGreeting(getGreeting());
      
      if (token && userId && isAuthenticated) {
        console.log('✅ useHomeData: Veri çekme başlıyor');
        await fetchData(token, userId);
      } else {
        console.log('⚠️ useHomeData: Token veya userId yok, hata gösteriliyor');
        setError("Oturum bilgileri alınamadı, lütfen tekrar giriş yapın.");
        setLoading(false);
      }
    };
    
    loadData();
  }, [token, userId, isAuthenticated, setToken, setUserId]);

  const fetchData = async (token: string, userId: string) => {
    setLoading(true);
      setError(null);
    try {
      // Tüm veri çekme işlemlerini paralel olarak başlat
      await Promise.all([
        fetchUserProfile(token),
        fetchUserVehicles(token),
        fetchLastMaintenance(token, userId),
        fetchInsuranceInfo(),
        fetchVehicleStatus(),
        fetchServiceProviders(token), // Usta listesini çeken fonksiyon eklendi
        fetchCampaigns(),
        fetchAds(),
        fetchTireStatus(),
        fetchAppointments(token),
      ]);
    } catch (err: any) {
      console.error('Veriler yüklenirken hata oluştu:', err);
      setError('Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (token: string) => {
    try {
      console.log('🔍 Frontend: fetchUserProfile çağrıldı');
      console.log('🔍 Frontend: API_URL:', API_URL);
      console.log('🔍 Frontend: Token:', token ? 'Mevcut' : 'Yok');
      
      // API_URL zaten /api prefix'i içeriyor, bu yüzden /users/profile kullanıyoruz
      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('✅ Frontend: API Response:', response.data);
      
      // API response formatı: { success: true, data: {...}, message: "..." }
      if (response.data && response.data.success && response.data.data) {
        const userData = response.data.data;
        if (userData.name && userData.name.trim()) {
          console.log('✅ Frontend: Kullanıcı ismi set ediliyor:', userData.name);
          setUserName(userData.name.trim());
        } else {
          console.log('⚠️ Frontend: API\'den isim gelmedi, varsayılan kullanılıyor');
          setUserName('Kullanıcı');
        }
      } else {
        console.log('⚠️ Frontend: API response formatı beklenenden farklı');
        setUserName('Kullanıcı');
      }
    } catch (error: any) {
      console.error('❌ Frontend: Kullanıcı profili getirilirken hata:', error);
      console.error('❌ Frontend: Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      // Hata durumunda varsayılan isim kullan
      setUserName('Kullanıcı');
    }
  };

  const fetchUserVehicles = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // API response formatı kontrol et
      if (response.data && response.data.success && response.data.data) {
        const vehicles = response.data.data;
        if (vehicles.length > 0) {
          // Favori araç bul
          const favorite = vehicles.find((v: Vehicle) => v.isFavorite);
          if (favorite) {
            setFavoriteCar({
              _id: favorite._id,
              userId: favorite.userId,
              brand: favorite.brand,
              model: favorite.modelName || favorite.model, // modelName veya model
              package: favorite.package,
              year: favorite.year,
              fuelType: favorite.fuelType,
              mileage: favorite.mileage,
              plateNumber: favorite.plateNumber,
              isFavorite: favorite.isFavorite,
              createdAt: favorite.createdAt
            });
          }
        }
      }
    } catch (error) {
      console.error('Araçlar getirilirken hata:', error);
      setFavoriteCar(null);
    }
  };

  const fetchLastMaintenance = async (token: string, userId: string) => {
    // ... (mevcut kod korunacak)
  };

  const fetchInsuranceInfo = async () => {
    // ... (mevcut kod korunacak)
  };

  const fetchVehicleStatus = async () => {
    // ... (mevcut kod korunacak)
  };

  const fetchServiceProviders = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/mechanic-services/mechanics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // API response formatı kontrol et
      if (response.data && response.data.success && response.data.data) {
        // Hizmet isimlerini Türkçe'ye çevir
        const translatedProviders = translateServices(response.data.data);
        setServiceProviders(translatedProviders);
      } else if (response.data && Array.isArray(response.data)) {
        // Eski format için fallback
        const translatedProviders = translateServices(response.data);
        setServiceProviders(translatedProviders);
      } else {
        setServiceProviders([]);
      }
    } catch (error) {
      console.error('Servis sağlayıcıları getirilirken hata:', error);
      setServiceProviders([]);
    }
  };

  const fetchCampaigns = async () => {
    // ... (mevcut kod korunacak)
  };

  const fetchAds = async () => {
    // ... (mevcut kod korunacak)
  };

  const fetchTireStatus = async () => {
    // ... (mevcut kod korunacak)
  };

  const fetchAppointments = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/maintenance-appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data && response.data.success && response.data.data) {
        // Hizmet isimlerini Türkçe'ye çevir
        const translatedAppointments = translateServices(response.data.data);
        setAppointments(translatedAppointments);
      } else if (response.data && Array.isArray(response.data)) {
        // Eski format için fallback
        const translatedAppointments = translateServices(response.data);
        setAppointments(translatedAppointments);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Randevular getirilirken hata:', error);
      setAppointments([]);
    }
  };

  const refreshData = async () => {
    if (token && userId) {
      await fetchData(token, userId);
    }
  };

  // AsyncStorage temizleme fonksiyonu kaldırıldı

  return {
    userId: userId,
    userName,
    greeting,
    token: token,
    favoriteCar,
    maintenanceRecord,
    insuranceInfo,
    vehicleStatus,
    serviceProviders,
    campaigns,
    ads,
    loading,
    error,
    refreshData,
    tireStatus,
    appointments,
  };
}; 