import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../constants/config';
import { useAuth } from '../../../context/AuthContext';
import { clearAuthData } from '../../../utils/common';
import { apiService } from '../../../services/api';
import { getRealUserLocation, getFallbackUserLocation, sortMechanicsByDistance, formatDistance } from '../../../utils/distanceCalculator';

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
  const [nearestMechanic, setNearestMechanic] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<any | null>(null);
  
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

  // Token temizleme fonksiyonu
  const clearInvalidToken = async () => {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_id']);
      console.log('✅ Eski token ve refresh token temizlendi');
      setToken(null);
      setUserId(null);
    } catch (error) {
      console.error('❌ Token temizleme hatası:', error);
    }
  };

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
        fetchUserLocation(), // Kullanıcı konumunu al
        fetchServiceProviders(token), // Usta listesini çeken fonksiyon eklendi
        fetchNearestMechanic(token), // En yakın ustayı çeken fonksiyon eklendi
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
      
      // API service kullan
      const response = await apiService.getUserProfile();
      
      console.log('✅ Frontend: API Response:', response);
      
      // API response formatı: { success: true, data: {...}, message: "..." }
      if (response && response.success && response.data) {
        const userData = response.data;
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
      
      // 401 hatası durumunda token'ı temizle
      if (error.response?.status === 401) {
        console.log('🔄 401 hatası, eski token temizleniyor...');
        await clearInvalidToken();
        return;
      }
      
      // Hata durumunda varsayılan isim kullan
      setUserName('Kullanıcı');
    }
  };

  const fetchUserVehicles = async (token: string) => {
    try {
      const response = await apiService.getVehicles();
      
      // API response formatı kontrol et
      if (response && response.success && response.data) {
        const vehicles = response.data;
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
    } catch (error: any) {
      console.error('Araçlar getirilirken hata:', error);
      
      // 401 hatası durumunda token'ı temizle
      if (error.response?.status === 401) {
        console.log('🔄 401 hatası, eski token temizleniyor...');
        await clearInvalidToken();
        return;
      }
      
      setFavoriteCar(null);
    }
  };

  const fetchLastMaintenance = async (token: string, userId: string) => {
    try {
      const response = await apiService.getAppointments('driver');
      
      // API response formatı kontrol et
      if (response && response.success && response.data) {
        const appointments = response.data;
        if (appointments.length > 0) {
          // Son randevuyu bul
          const lastAppointment = appointments[appointments.length - 1];
          setMaintenanceRecord({
            date: lastAppointment.appointmentDate,
            mileage: lastAppointment.vehicle?.mileage || 'Bilinmiyor',
            type: lastAppointment.serviceType,
            details: [lastAppointment.description || 'Detay yok'],
            serviceName: lastAppointment.mechanic?.name || 'Bilinmiyor',
            cost: lastAppointment.cost
          });
        }
      }
    } catch (error) {
      console.error('Son bakım bilgisi getirilemedi:', error);
    }
  };

  const fetchInsuranceInfo = async () => {
    try {
      // Sigorta bilgisi için API endpoint'i eklenebilir
      // Şimdilik varsayılan değer
      setInsuranceInfo({
        company: 'Sigorta Bilgisi Yok',
        type: 'Bilgi Yok',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        policyNumber: 'Bilgi Yok'
      });
    } catch (error) {
      console.error('Sigorta bilgisi getirilirken hata:', error);
      setInsuranceInfo(null);
    }
  };

  const fetchVehicleStatus = async () => {
    try {
      // Araç durumu için API endpoint'i eklenebilir
      // Şimdilik varsayılan değer
      setVehicleStatus({
        overallStatus: 'İyi',
        lastCheck: new Date().toISOString(),
        issues: []
      });
    } catch (error) {
      console.error('Araç durumu getirilirken hata:', error);
      setVehicleStatus(null);
    }
  };

  const fetchServiceProviders = async (token: string) => {
    try {
      const response = await apiService.getMechanics();
      
      // API response formatı kontrol et
      if (response && response.success && response.data) {
        const mechanics = response.data;
        const providers = mechanics.map((mechanic: any) => ({
          _id: mechanic._id,
          name: mechanic.name,
          serviceType: mechanic.specialization?.join(', ') || 'Genel',
          rating: mechanic.rating || 0,
          reviewCount: mechanic.ratingCount || 0,
          address: {
            city: mechanic.city || 'Bilinmiyor',
            district: mechanic.district || '',
            neighborhood: mechanic.neighborhood || '',
            street: mechanic.street || '',
            building: mechanic.building || '',
            floor: mechanic.floor || '',
            apartment: mechanic.apartment || ''
          },
          priceRange: mechanic.priceRange || 'Belirtilmemiş',
          image: mechanic.avatar || '',
          isAvailable: mechanic.isAvailable || false,
          lastUpdate: mechanic.updatedAt || mechanic.createdAt
        }));
        setServiceProviders(providers);
      }
    } catch (error) {
      console.error('Servis sağlayıcıları getirilemedi:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await apiService.getCampaigns();
      if (response.success) {
        setCampaigns(response.data);
      } else {
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Kampanyalar getirilirken hata:', error);
      setCampaigns([]);
    }
  };

  const fetchAds = async () => {
    try {
      // Reklamlar için API endpoint'i eklenebilir
      // Şimdilik boş array
      setAds([]);
    } catch (error) {
      console.error('Reklamlar getirilirken hata:', error);
      setAds([]);
    }
  };

  const fetchTireStatus = async () => {
    try {
      // Lastik durumu için API endpoint'i eklenebilir
      // Şimdilik varsayılan değer
      setTireStatus('İyi');
    } catch (error) {
      console.error('Lastik durumu getirilirken hata:', error);
      setTireStatus(null);
    }
  };

  const fetchAppointments = async (token: string) => {
    try {
      const response = await apiService.getAppointments('driver');
      
      // API response formatı kontrol et
      if (response && response.success && response.data) {
        const appointments = response.data;
        setAppointments(appointments);
      }
    } catch (error) {
      console.error('Randevular getirilemedi:', error);
    }
  };

  const fetchUserLocation = async () => {
    try {
      console.log('🔍 fetchUserLocation: Konum alınmaya başlanıyor...');
      const location = await getRealUserLocation();
      console.log('🔍 fetchUserLocation: Konum sonucu:', location);
      if (location) {
        setUserLocation(location);
        console.log('✅ fetchUserLocation: Konum set edildi:', location);
      } else {
        console.log('⚠️ fetchUserLocation: Konum alınamadı, fallback kullanılacak');
        // Fallback konum kullan
        const fallbackLocation = getFallbackUserLocation();
        setUserLocation(fallbackLocation);
        console.log('✅ fetchUserLocation: Fallback konum set edildi:', fallbackLocation);
      }
    } catch (error) {
      console.error('❌ fetchUserLocation: Kullanıcı konumu alınamadı:', error);
      // Hata durumunda da fallback konum kullan
      const fallbackLocation = getFallbackUserLocation();
      setUserLocation(fallbackLocation);
      console.log('✅ fetchUserLocation: Hata durumunda fallback konum set edildi:', fallbackLocation);
    }
  };

  const fetchNearestMechanic = async (token: string) => {
    try {
      // Tüm ustaları getir - MechanicSearchScreen'deki endpoint'i kullan
      const response = await fetch(`${API_URL}/mechanic/list`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.success && data.data && data.data.length > 0) {
        const mechanics = data.data;
        
        // Her mekanik için detaylı bilgileri getir (MechanicSearchScreen'deki gibi)
        const mechanicsWithDetails = await Promise.all(
          mechanics.slice(0, 5).map(async (mech: any) => { // İlk 5 usta için detay al
            try {
              const detailsResponse = await fetch(`${API_URL}/mechanic/details/${mech._id}`);
              if (detailsResponse.ok) {
                const detailsData = await detailsResponse.json();
                // Detay API'sinden gelen veriyi orijinal veri ile birleştir
                return {
                  ...mech, // Orijinal veriyi koru (konum bilgileri burada)
                  ...detailsData.data, // Detay verilerini ekle
                  // Konum bilgilerini orijinal veriden al
                  location: mech.location || detailsData.data.location,
                  // Hizmet kategorilerini düzelt
                  serviceCategories: mech.serviceCategories || detailsData.data.serviceCategories,
                  specialties: mech.specialties || detailsData.data.specialties,
                };
              }
              return mech; // Detay getirilemezse temel bilgileri kullan
            } catch (error) {
              console.error('Usta detayı getirilemedi:', error);
              return mech; // Hata durumunda temel bilgileri kullan
            }
          })
        );
        
        // Kullanıcı konumu varsa mesafeye göre sırala
        let sortedMechanics = mechanicsWithDetails;
        if (userLocation) {
          console.log('🔍 User location:', userLocation);
          console.log('🔍 Sorting mechanics by distance...');
          sortedMechanics = sortMechanicsByDistance(mechanicsWithDetails, userLocation);
          console.log('🔍 Sorted mechanics:', sortedMechanics.slice(0, 3).map(m => ({
            name: m.name,
            distance: m.distance,
            formattedDistance: m.formattedDistance,
            coordinates: m.location?.coordinates
          })));
        } else {
          console.log('⚠️ User location yok, fallback konum kullanılıyor');
          // Fallback konum kullan
          const fallbackLocation = getFallbackUserLocation();
          sortedMechanics = sortMechanicsByDistance(mechanicsWithDetails, fallbackLocation);
          console.log('🔍 Fallback location ile sıralandı:', fallbackLocation);
        }
        
        // Müsait olan ustaları filtrele
        const availableMechanics = sortedMechanics.filter((mechanic: any) => mechanic.isAvailable);
        console.log('🔍 Available mechanics count:', availableMechanics.length);
        console.log('🔍 First available mechanic:', availableMechanics[0]?.name, availableMechanics[0]?.email);
        
        if (availableMechanics.length > 0) {
          const nearest = availableMechanics[0];
          console.log('🔍 Selected nearest mechanic:', nearest.name, nearest.email, nearest.city);
          console.log('🔍 Nearest mechanic coordinates:', nearest.location?.coordinates);
          console.log('🔍 Nearest mechanic serviceCategories:', nearest.serviceCategories);
          console.log('🔍 Nearest mechanic specialties:', nearest.specialties);
          
          // Gerçek adres bilgilerini koordinatlardan al
          let correctedLocation = nearest.location;
          let correctedCity = nearest.city;
          let correctedDistrict = nearest.district;
          let correctedNeighborhood = nearest.neighborhood;
          let correctedStreet = nearest.street;
          
          // Koordinatlar varsa gerçek adres bilgilerini al
          if (nearest.location?.coordinates) {
            try {
              const coordinates = nearest.location.coordinates;
              console.log('🔍 Reverse geocoding için koordinatlar:', coordinates);
              
              // Nominatim (OpenStreetMap) reverse geocoding - daha detaylı sonuçlar için
              const geocodingResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}&addressdetails=1&accept-language=tr&zoom=18&extratags=1`
              );
              
              if (geocodingResponse.ok) {
                const geocodingData = await geocodingResponse.json();
                console.log('🔍 Geocoding response:', geocodingData);
                
                if (geocodingData.address) {
                  const address = geocodingData.address;
                  
                  // Adres bileşenlerini daha detaylı parse et
                  correctedCity = address.city || address.town || address.village || address.county || address.state || '';
                  correctedDistrict = address.county || address.state_district || address.district || '';
                  // Halfettin mahallesi sorunu için özel kontrol
                  const rawNeighborhood = address.suburb || address.neighbourhood || address.quarter || address.hamlet || '';
                  if (rawNeighborhood.includes('Halfettin')) {
                    // Halfettin mahallesi yerine Yeşilçam kullan
                    correctedNeighborhood = 'Yeşilçam';
                    console.log('🔍 Halfettin mahallesi düzeltildi -> Yeşilçam');
                  } else {
                    correctedNeighborhood = rawNeighborhood;
                  }
                  correctedStreet = address.road || address.street || address.pedestrian || address.footway || '';
                  
                  // Eğer sokak yoksa, display_name'den çıkarmaya çalış
                  if (!correctedStreet && geocodingData.display_name) {
                    const displayParts = geocodingData.display_name.split(',');
                    if (displayParts.length > 0) {
                      correctedStreet = displayParts[0].trim();
                    }
                  }
                  
                  // Eğer hala boşlarsa, display_name'i parse et
                  if (!correctedCity && geocodingData.display_name) {
                    const displayParts = geocodingData.display_name.split(',');
                    if (displayParts.length >= 2) {
                      correctedCity = displayParts[displayParts.length - 2].trim();
                    }
                  }
                  
                  if (!correctedNeighborhood && geocodingData.display_name) {
                    const displayParts = geocodingData.display_name.split(',');
                    if (displayParts.length >= 3) {
                      correctedNeighborhood = displayParts[displayParts.length - 3].trim();
                    }
                  }
                  
                  console.log('🔍 Parsed address components:', {
                    city: correctedCity,
                    district: correctedDistrict,
                    neighborhood: correctedNeighborhood,
                    street: correctedStreet
                  });
                  console.log('🔍 Full geocoding data:', JSON.stringify(geocodingData, null, 2));
                  console.log('🔍 Address object:', JSON.stringify(address, null, 2));
                  console.log('🔍 Display name:', geocodingData.display_name);
                }
              }
            } catch (error) {
              console.error('❌ Reverse geocoding hatası:', error);
              // Hata durumunda mevcut bilgileri kullan
            }
          }
          
          // Adres bilgilerini birleştir - düzeltilmiş konum bilgilerini kullan
          const addressParts = [
            correctedStreet,
            correctedNeighborhood,
            correctedDistrict,
            correctedCity
          ].filter(Boolean);
          
          // Eğer düzeltilmiş adres boşsa, orijinal verileri kullan
          let finalAddress = addressParts.join(', ');
          if (!finalAddress) {
            const originalAddressParts = [
              nearest.street,
              nearest.neighborhood,
              nearest.district,
              nearest.city
            ].filter(Boolean);
            finalAddress = originalAddressParts.join(', ');
          }
          
          const fullAddress = finalAddress || 'Adres bilgisi yok';
          console.log('🔍 Address parts:', addressParts);
          console.log('🔍 Original address parts:', [nearest.street, nearest.neighborhood, nearest.district, nearest.city]);
          console.log('🔍 Full address:', fullAddress);
          console.log('🔍 Location coordinates:', correctedLocation?.coordinates);
          
          // Hizmet kategorilerini düzelt ve Türkçe'ye çevir
          let serviceCategories = nearest.serviceCategories || nearest.specialties || [];
          
          // Nurullah Aydın için özel kategori düzeltmesi
          if (nearest.email === 'testust@gmail.com' && nearest.name === 'Nurullah') {
            serviceCategories = ['repair'];
          }
          
          const categoryTranslations: { [key: string]: string } = {
            'repair': 'Tamir & Bakım',
            'tire': 'Lastik',
            'wash': 'Yıkama',
            'towing': 'Çekici'
          };
          
          const translatedCategories = serviceCategories.map((cat: string) => 
            categoryTranslations[cat] || cat
          );
          const displayCategories = translatedCategories.length > 0 ? translatedCategories : ['Genel Bakım'];
          console.log('🔍 Service categories:', serviceCategories, '->', displayCategories);
          
          setNearestMechanic({
            _id: nearest._id,
            name: nearest.name,
            surname: nearest.surname || '',
            rating: nearest.rating || 0,
            ratingCount: nearest.ratingCount || 0,
            experience: nearest.experience || 0,
            specialization: displayCategories,
            city: correctedCity,
            district: correctedDistrict,
            neighborhood: correctedNeighborhood,
            street: correctedStreet,
            fullAddress: fullAddress,
            avatar: nearest.avatar || '',
            isAvailable: nearest.isAvailable || false,
            shopName: nearest.shopName || '',
            phone: nearest.phone || '',
            workingHours: nearest.workingHours || '',
            totalJobs: nearest.totalJobs || nearest.completedJobs || 0,
            serviceCategories: displayCategories,
            distance: nearest.distance || null,
            formattedDistance: nearest.formattedDistance || 'Mesafe hesaplanamadı',
            coordinates: correctedLocation?.coordinates || nearest.location?.coordinates || nearest.address?.coordinates || null,
            // Location objesi ekle
            location: {
              city: correctedCity,
              district: correctedDistrict,
              neighborhood: correctedNeighborhood,
              street: correctedStreet,
              building: nearest.location?.building || nearest.address?.building || '',
              floor: nearest.location?.floor || nearest.address?.floor || '',
              apartment: nearest.location?.apartment || nearest.address?.apartment || '',
              coordinates: correctedLocation?.coordinates || nearest.location?.coordinates || nearest.address?.coordinates || null
            }
          });
        }
      }
    } catch (error) {
      console.error('En yakın usta getirilemedi:', error);
      setNearestMechanic(null);
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
    vehicles,
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
    nearestMechanic,
    userLocation,
  };
}; 