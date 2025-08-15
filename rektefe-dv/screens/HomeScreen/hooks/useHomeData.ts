import { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../constants/config';
import { useAuth } from '../../../context/AuthContext';

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
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [token, setToken] = useState<string>('');
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
  const { token: ctxToken, userId: ctxUserId, logout } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      if (ctxToken && ctxUserId) {
        setToken(ctxToken);
        setUserId(ctxUserId);
        await fetchData(ctxToken, ctxUserId);
      } else {
        // Token veya userId yoksa, kullanıcıyı giriş ekranına yönlendir veya hata göster
        // logout(); // Örneğin: Oturumu kapat
        setError("Oturum bilgileri alınamadı, lütfen tekrar giriş yapın.");
        setLoading(false);
      }
    };
    loadData();
  }, [ctxToken, ctxUserId]);

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
      
      if (response.data && response.data.name) {
        console.log('✅ Frontend: Kullanıcı ismi set ediliyor:', response.data.name);
        setUserName(response.data.name);
      } else {
        console.log('⚠️ Frontend: API\'den isim gelmedi, varsayılan kullanılıyor');
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
    // ... (mevcut kod korunacak)
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
      if (response.data && response.data.length > 0) {
        setServiceProviders(response.data);
      } else {
        setServiceProviders([]); // Veri gelmezse boş dizi ata
      }
    } catch (error) {
      console.error('Servis sağlayıcıları getirilirken hata:', error);
      // Bu hatayı genel hata durumuna yansıtabiliriz veya görmezden gelebiliriz.
      // Şimdilik sadece konsola yazdırıyoruz ki diğer veriler yüklensin.
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
    // ... (mevcut kod korunacak)
  };

  const refreshData = async () => {
    if (token && userId) {
      await fetchData(token, userId);
    }
  };

  return {
    userId,
    userName,
    token,
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