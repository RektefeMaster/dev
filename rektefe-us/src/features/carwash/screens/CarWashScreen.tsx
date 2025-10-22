import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  FlatList,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { serviceNameMapping } from '@/shared/utils/serviceTranslator';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, shadows, dimensions, typography } from '@/shared/theme';
import apiService from '@/shared/services';

const { width } = Dimensions.get('window');

interface CarWashPackage {
  _id: string;
  name: string;
  description: string;
  packageType: 'basic' | 'premium' | 'deluxe' | 'detailing' | 'custom';
  services: Array<{
    serviceName: string;
    serviceType: 'exterior' | 'interior' | 'engine' | 'special';
    duration: number;
    price: number;
    description: string;
    isOptional: boolean;
    order: number;
  }>;
  pricing: {
    basePrice: number;
    vehicleTypeMultipliers: {
      car: number;
      suv: number;
      truck: number;
      motorcycle: number;
      van: number;
    };
    duration: number;
    maxDuration: number;
  };
  features: {
    includesInterior: boolean;
    includesExterior: boolean;
    includesEngine: boolean;
    includesWaxing: boolean;
    includesPolishing: boolean;
    includesDetailing: boolean;
    ecoFriendly: boolean;
    premiumProducts: boolean;
  };
  images: string[];
  thumbnail: string;
  isActive: boolean;
  isPopular: boolean;
}

interface MobileWashJob {
  id: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  vehicleType: 'car' | 'motorcycle' | 'truck' | 'van' | 'suv';
  vehicleYear: number;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  washType: 'basic' | 'premium' | 'deluxe' | 'detailing' | 'interior' | 'exterior';
  washLevel: 'light' | 'medium' | 'heavy' | 'extreme';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedAt: string;
  estimatedTime?: string;
  estimatedDuration?: number;
  price?: number;
  notes?: string;
  services?: Array<{
    name: string;
    price: number;
    duration: number;
    completed: boolean;
  }>;
  customerLocation?: { lat: number; lng: number };
  mechanicLocation?: { lat: number; lng: number };
  photos?: string[];
  specialRequests?: string[];
}

interface CarWashJob {
  _id: string;
  customerId: {
    _id: string;
    name: string;
    surname: string;
    phone: string;
  };
  vehicleId: {
    _id: string;
    brand: string;
    modelName: string;
    plateNumber: string;
    year: number;
  };
  packageId: {
    _id: string;
    name: string;
    packageType: string;
  };
  vehicleInfo: {
    brand: string;
    model: string;
    year: number;
    plateNumber: string;
    vehicleType: 'car' | 'suv' | 'truck' | 'motorcycle' | 'van';
    color: string;
    size: 'small' | 'medium' | 'large' | 'extra_large';
  };
  services: Array<{
    serviceName: string;
    serviceType: 'exterior' | 'interior' | 'engine' | 'special';
    duration: number;
    price: number;
    completed: boolean;
    completedAt?: string;
    notes?: string;
    photos?: string[];
  }>;
  pricing: {
    basePrice: number;
    vehicleMultiplier: number;
    loyaltyDiscount: number;
    loyaltyDiscountAmount: number;
    tefePointDiscount: number;
    tefePointDiscountAmount: number;
    totalDiscount: number;
    finalPrice: number;
    paidAmount: number;
    paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  };
  loyaltyInfo: {
    customerLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
    visitCount: number;
    totalSpent: number;
    loyaltyScore: number;
    appliedDiscount: number;
  };
  scheduling: {
    requestedAt: string;
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    estimatedDuration: number;
    actualDuration?: number;
    timeSlot?: {
      startTime: string;
      endTime: string;
    };
  };
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    isMobile: boolean;
  };
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  specialRequests: string[];
  notes: string;
  createdAt: string;
}

export default function CarWashScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'packages' | 'jobs' | 'loyalty' | 'mobile'>('packages');
  
  // Hizmet ismini çeviren fonksiyon
  const translateServiceName = (serviceName: string): string => {
    if (serviceNameMapping[serviceName]) {
      return serviceNameMapping[serviceName];
    }
    return serviceName;
  };
  
  // Packages
  const [packages, setPackages] = useState<CarWashPackage[]>([]);
  const [selectedPackageType, setSelectedPackageType] = useState<string>('');
  
  // Jobs
  const [jobs, setJobs] = useState<CarWashJob[]>([]);
  const [selectedJobStatus, setSelectedJobStatus] = useState<string>('');
  
  // Mobile Wash Jobs
  const [mobileJobs, setMobileJobs] = useState<MobileWashJob[]>([]);
  const [mobileJobFilter, setMobileJobFilter] = useState<'active' | 'history'>('active');
  
  // Modals
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showJobDetailModal, setShowJobDetailModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [isSetupLoyaltyModalVisible, setIsSetupLoyaltyModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CarWashJob | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<CarWashPackage | null>(null);
  const [editingPackage, setEditingPackage] = useState(false);
  
  // Loyalty Program
  const [tempLoyaltyProgram, setTempLoyaltyProgram] = useState<any>(null);
  const [loyaltyProgram, setLoyaltyProgram] = useState<any>(null);
  
  // Stats
  const [stats, setStats] = useState({
    activeCustomers: 0,
    vipCustomers: 0,
    totalVisits: 0,
    totalEarnings: 0
  });
  
  // Create package form
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    packageType: 'basic' as 'basic' | 'premium' | 'deluxe' | 'detailing' | 'custom',
    basePrice: 0,
    estimatedDuration: 30, // Dakika cinsinden tahmini süre
    services: [] as Array<{
      serviceName: string;
      serviceType: 'exterior' | 'interior' | 'engine' | 'special';
      duration: number;
      price: number;
      description: string;
      isOptional: boolean;
      order: number;
    }>,
    features: {
      includesInterior: false,
      includesExterior: true,
      includesEngine: false,
      includesWaxing: false,
      includesPolishing: false,
      includesDetailing: false,
      ecoFriendly: false,
      premiumProducts: false
    }
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'packages') {
        await fetchPackages();
      } else if (activeTab === 'jobs') {
        await fetchJobs();
      } else if (activeTab === 'mobile') {
        await fetchMobileJobs();
      } else if (activeTab === 'loyalty') {
        await fetchLoyaltyProgram();
        await fetchStats();
      }
      
    } catch (error) {
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoyaltyProgram = async () => {
    try {
      const response = await apiService.CarWashService.getLoyaltyProgram();
      if (response.success && response.data) {
        setLoyaltyProgram(response.data);
      }
    } catch (error) {
      console.log('Sadakat programı henüz kurulmamış');
    }
  };

  const fetchStats = async () => {
    try {
      // Backend'den gerçek istatistikleri çek
      const jobsResponse = await apiService.CarWashService.getCarWashJobs();
      if (jobsResponse.success && jobsResponse.data) {
        const allJobs = jobsResponse.data;
        const completedJobs = allJobs.filter((job: any) => job.status === 'completed');
        
        // Benzersiz müşteri sayısı
        const uniqueCustomers = new Set(completedJobs.map((job: any) => job.customerId._id));
        
        // VIP müşteriler (gold ve platinum)
        const vipCount = completedJobs.filter((job: any) => 
          job.loyaltyInfo?.customerLevel === 'gold' || 
          job.loyaltyInfo?.customerLevel === 'platinum'
        ).length;
        
        // Toplam kazanç
        const totalEarnings = completedJobs.reduce((sum: number, job: any) => 
          sum + (job.pricing?.finalPrice || 0), 0
        );
        
        setStats({
          activeCustomers: uniqueCustomers.size,
          vipCustomers: vipCount,
          totalVisits: completedJobs.length,
          totalEarnings: totalEarnings
        });
      }
    } catch (error) {
      console.log('İstatistikler yüklenemedi');
    }
  };

  const fetchPackages = async () => {
    try {
      // Yeni API'den kendi paketlerini getir
      const response = await apiService.CarWashService.getMyWashPackages();
      if (response.success) {
        setPackages(response.data || []);
      } else {
        // Eski API'yi dene (fallback)
        const fallbackResponse = await apiService.CarWashService.getCarWashPackages(selectedPackageType);
        if (fallbackResponse.success) {
          setPackages(fallbackResponse.data || []);
        } else {
          Alert.alert('Hata', 'Paketler yüklenemedi');
        }
      }
    } catch (error) {
      Alert.alert('Hata', 'Paketler yüklenirken bir hata oluştu');
    }
  };

  const fetchJobs = async () => {
    try {
      // Yeni API'den işleri getir
      const response = await apiService.CarWashService.getWashJobs(selectedJobStatus);
      if (response.success) {
        setJobs(response.data || []);
      } else {
        // Eski API'yi dene (fallback)
        const fallbackResponse = await apiService.CarWashService.getCarWashJobs(selectedJobStatus);
        if (fallbackResponse.success) {
          setJobs(fallbackResponse.data || []);
        } else {
          Alert.alert('Hata', 'Yıkama işleri yüklenemedi');
        }
      }
    } catch (error) {
      Alert.alert('Hata', 'Yıkama işleri yüklenirken bir hata oluştu');
    }
  };

  const fetchMobileJobs = async () => {
    try {
      const response = await apiService.CarWashService.getWashJobs();
      if (response.success) {
        setMobileJobs(response.data || []);
      } else {
        setMobileJobs([]);
      }
    } catch (error) {
      Alert.alert('Hata', 'Mobil yıkama işleri yüklenirken bir hata oluştu');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCreatePackage = async () => {
    try {
      if (!packageForm.name || !packageForm.description) {
        Alert.alert('Hata', 'Lütfen paket adı ve açıklamasını doldurun');
        return;
      }

      if (packageForm.basePrice <= 0) {
        Alert.alert('Hata', 'Lütfen geçerli bir fiyat girin');
        return;
      }

      // Backend'in kabul ettiği alanları hazırla (estimatedDuration hariç)
      const packageData = {
        name: packageForm.name,
        description: packageForm.description,
        packageType: packageForm.packageType,
        basePrice: packageForm.basePrice,
        features: packageForm.features,
        vehicleTypeMultipliers: {
          car: 1.0,
          suv: 1.2,
          truck: 1.5,
          motorcycle: 0.6,
          van: 1.3
        },
        // Eğer services boş ise placeholder ekle
        services: packageForm.services.length > 0 ? packageForm.services : [{
          serviceName: 'Standart Hizmet',
          serviceType: 'exterior' as const,
          duration: packageForm.estimatedDuration,
          price: packageForm.basePrice,
          description: packageForm.description,
          isOptional: false,
          order: 1
        }]
      };

      const response = editingPackage && selectedPackage
        ? await apiService.CarWashService.createCarWashPackage({ ...packageData, _id: selectedPackage._id })
        : await apiService.CarWashService.createCarWashPackage(packageData);
        
      if (response.success) {
        Alert.alert('Başarılı', editingPackage ? 'Paket başarıyla güncellendi' : 'Paket başarıyla oluşturuldu');
        setShowCreatePackageModal(false);
        resetPackageForm();
        await fetchPackages();
      } else {
        Alert.alert('Hata', response.message || (editingPackage ? 'Paket güncellenemedi' : 'Paket oluşturulamadı'));
      }
    } catch (error) {
      Alert.alert('Hata', editingPackage ? 'Paket güncellenirken bir hata oluştu' : 'Paket oluşturulurken bir hata oluştu');
      console.error('Create/Update package error:', error);
    }
  };

  const handleStartJob = async (jobId: string) => {
    try {
      const response = await apiService.CarWashService.startCarWashJob(jobId);
      if (response.success) {
        Alert.alert('Başarılı', 'Yıkama işi başlatıldı');
        await fetchJobs();
      } else {
        Alert.alert('Hata', response.message || 'İş başlatılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'İş başlatılırken bir hata oluştu');
    }
  };

  const handleCompleteService = async (jobId: string, serviceName: string) => {
    try {
      const response = await apiService.CarWashService.completeCarWashService(jobId, serviceName);
      if (response.success) {
        Alert.alert('Başarılı', 'Hizmet tamamlandı');
        await fetchJobs();
      } else {
        Alert.alert('Hata', response.message || 'Hizmet tamamlanamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Hizmet tamamlanırken bir hata oluştu');
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    try {
      const response = await apiService.CarWashService.completeCarWashJob(jobId, {
        passed: true,
        checkedBy: user?.userId || '',
        issues: [],
        photos: []
      });
      if (response.success) {
        Alert.alert('Başarılı', 'Yıkama işi tamamlandı');
        setShowJobDetailModal(false);
        await fetchJobs();
      } else {
        Alert.alert('Hata', response.message || 'İş tamamlanamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'İş tamamlanırken bir hata oluştu');
    }
  };

  const resetPackageForm = () => {
    setPackageForm({
      name: '',
      description: '',
      packageType: 'basic',
      basePrice: 0,
      estimatedDuration: 30,
      services: [],
      features: {
        includesInterior: false,
        includesExterior: true,
        includesEngine: false,
        includesWaxing: false,
        includesPolishing: false,
        includesDetailing: false,
        ecoFriendly: false,
        premiumProducts: false
      }
    });
    setEditingPackage(false);
    setSelectedPackage(null);
  };

  const handleEditPackage = (pkg: CarWashPackage) => {
    setSelectedPackage(pkg);
    setEditingPackage(true);
    setPackageForm({
      name: pkg.name,
      description: pkg.description,
      packageType: pkg.packageType,
      basePrice: pkg.pricing.basePrice,
      estimatedDuration: pkg.pricing.duration || 30,
      services: pkg.services,
      features: pkg.features
    });
    setShowCreatePackageModal(true);
  };

  const handleUsePackage = (pkg: CarWashPackage) => {
    Alert.alert(
      'Hızlı İşlem',
      'Bu paket ile yeni bir yıkama işi başlatmak istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Devam Et', 
          onPress: () => {
            // Navigate to quick job creation with package pre-selected
            Alert.alert('Bilgi', 'Hızlı iş oluşturma ekranı yakında eklenecek');
          }
        }
      ]
    );
  };

  const handleSetupLoyaltyProgram = async () => {
    if (!tempLoyaltyProgram?.programName || !tempLoyaltyProgram.loyaltyLevels || tempLoyaltyProgram.loyaltyLevels.length === 0) {
      Alert.alert('Uyarı', 'Lütfen program adını ve en az bir sadakat seviyesini doldurun.');
      return;
    }

    try {
      const response = await apiService.CarWashService.setupLoyaltyProgram(tempLoyaltyProgram);
      if (response.success) {
        Alert.alert('Başarılı', 'Sadakat programı başarıyla yapılandırıldı.');
        setIsSetupLoyaltyModalVisible(false);
        setLoyaltyProgram(tempLoyaltyProgram);
        await fetchLoyaltyProgram();
      } else {
        Alert.alert('Hata', response.message || 'Sadakat programı yapılandırılamadı.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sadakat programı yapılandırılırken bir hata oluştu.');
      console.error('Setup Loyalty Program Error:', error);
    }
  };

  // Sadakat programı varsayılan değerleri
  const initializeDefaultLoyaltyProgram = () => {
    if (!tempLoyaltyProgram) {
      setTempLoyaltyProgram({
        _id: '',
        programName: 'Yıkama Sadakat Programı',
        description: 'Müşterilerinize özel indirimler ve avantajlar sunun',
        loyaltyLevels: [
          {
            level: 'bronze',
            levelName: 'Bronz Üye',
            minVisits: 5,
            minSpent: 500,
            benefits: {
              discountPercentage: 5,
              priorityService: false,
              freeUpgrades: false,
              specialOffers: true,
              birthdayDiscount: 10
            },
            color: '#CD7F32',
            icon: 'star-outline'
          },
          {
            level: 'silver',
            levelName: 'Gümüş Üye',
            minVisits: 15,
            minSpent: 1500,
            benefits: {
              discountPercentage: 10,
              priorityService: true,
              freeUpgrades: false,
              specialOffers: true,
              birthdayDiscount: 15
            },
            color: '#C0C0C0',
            icon: 'star-half'
          },
          {
            level: 'gold',
            levelName: 'Altın Üye',
            minVisits: 30,
            minSpent: 3000,
            benefits: {
              discountPercentage: 15,
              priorityService: true,
              freeUpgrades: true,
              specialOffers: true,
              birthdayDiscount: 20
            },
            color: '#FFD700',
            icon: 'star'
          },
          {
            level: 'platinum',
            levelName: 'Platin Üye',
            minVisits: 50,
            minSpent: 5000,
            benefits: {
              discountPercentage: 20,
              priorityService: true,
              freeUpgrades: true,
              specialOffers: true,
              birthdayDiscount: 25
            },
            color: '#E5E4E2',
            icon: 'diamond'
          }
        ],
        campaigns: [],
        referralProgram: {
          enabled: true,
          referrerBenefit: '10% indirim',
          referredBenefit: 'Ücretsiz temel yıkama'
        },
        birthdayCampaign: {
          enabled: true,
          discountPercentage: 15,
          message: 'Doğum gününüz kutlu olsun! Özel indiriminizi kullanın.'
        },
        pointsSystem: {
          enabled: true,
          pointsPerSpend: 1, // Her 10 TL için 1 puan
          redemptionRate: 10 // 100 puan = 10 TL indirim
        },
        isActive: true
      });
    }
  };

  const getPackageTypeText = (type: string) => {
    const types = {
      basic: 'Temel',
      premium: 'Premium',
      deluxe: 'Deluxe',
      detailing: 'Detaylı',
      custom: 'Özel'
    };
    return types[type as keyof typeof types] || type;
  };

  const getPackageTypeColor = (type: string) => {
    const colors = {
      basic: '#4CAF50',
      premium: '#2196F3',
      deluxe: '#FF9800',
      detailing: '#9C27B0',
      custom: '#607D8B'
    };
    return colors[type as keyof typeof colors] || '#666';
  };

  const getStatusText = (status: string) => {
    const statuses = {
      pending: 'Bekliyor',
      scheduled: 'Planlandı',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi',
      no_show: 'Gelmedi'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: '#FF9800',
      scheduled: '#2196F3',
      in_progress: '#4CAF50',
      completed: '#4CAF50',
      cancelled: '#F44336',
      no_show: '#9E9E9E'
    };
    return colors[status as keyof typeof colors] || '#666';
  };

  const getLoyaltyLevelText = (level: string) => {
    const levels = {
      bronze: 'Bronz',
      silver: 'Gümüş',
      gold: 'Altın',
      platinum: 'Platin'
    };
    return levels[level as keyof typeof levels] || level;
  };

  const getLoyaltyLevelColor = (level: string) => {
    const colors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2'
    };
    return colors[level as keyof typeof colors] || '#666';
  };

  const getQuoteStatusText = (status: string) => {
    const statuses = {
      draft: 'Taslak',
      sent: 'Gönderildi',
      accepted: 'Kabul Edildi',
      rejected: 'Reddedildi',
      expired: 'Süresi Doldu'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  // Mobile wash helper functions
  const getMobileWashTypeText = (type: string) => {
    const types = {
      basic: 'Temel Yıkama',
      premium: 'Premium Yıkama',
      deluxe: 'Deluxe Yıkama',
      detailing: 'Detay Temizlik',
      interior: 'İç Temizlik',
      exterior: 'Dış Temizlik'
    };
    return types[type as keyof typeof types] || type;
  };

  const getMobileWashTypeColor = (type: string) => {
    const typeColors = {
      basic: '#4CAF50',
      premium: '#2196F3',
      deluxe: '#FF9800',
      detailing: '#9C27B0',
      interior: '#607D8B',
      exterior: '#795548'
    };
    return typeColors[type as keyof typeof typeColors] || '#666';
  };

  const getMobileWashLevelText = (level: string) => {
    const levels = {
      light: 'Hafif',
      medium: 'Orta',
      heavy: 'Ağır',
      extreme: 'Aşırı Kirli'
    };
    return levels[level as keyof typeof levels] || level;
  };

  const getMobileWashLevelColor = (level: string) => {
    const levelColors = {
      light: '#4CAF50',
      medium: '#FF9800',
      heavy: '#F44336',
      extreme: '#9C27B0'
    };
    return levelColors[level as keyof typeof levelColors] || '#666';
  };

  const getMobileStatusText = (status: string) => {
    const texts = {
      pending: 'Bekliyor',
      accepted: 'Kabul Edildi',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getMobileStatusColor = (status: string) => {
    const statusColors = {
      pending: '#FF9800',
      accepted: '#2196F3',
      in_progress: '#4CAF50',
      completed: '#4CAF50',
      cancelled: '#F44336'
    };
    return statusColors[status as keyof typeof statusColors] || '#666';
  };

  const handleMobileJobAction = (jobId: string, action: 'accept' | 'start' | 'complete' | 'cancel') => {
    Alert.alert(
      'İşlem Onayı',
      `${action === 'accept' ? 'Kabul' : action === 'start' ? 'Başlat' : action === 'complete' ? 'Tamamla' : 'İptal'} etmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', onPress: () => performMobileJobAction(jobId, action) }
      ]
    );
  };

  const performMobileJobAction = async (jobId: string, action: string) => {
    try {
      setMobileJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: action === 'accept' ? 'accepted' : 
                     action === 'start' ? 'in_progress' : 
                     action === 'complete' ? 'completed' : 'cancelled'
            }
          : job
      ));
      
      Alert.alert('Başarılı', 'İşlem tamamlandı');
    } catch (error) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    }
  };

  const renderPackages = () => {
    // Her kategori için paket sayısını hesapla
    const getPackageCount = (type: string) => {
      return packages.filter(pkg => pkg.packageType === type).length;
    };

    const filteredPackages = packages.filter(pkg => !selectedPackageType || pkg.packageType === selectedPackageType);

    return (
    <View style={styles.tabContent}>
      {/* Yeni Paket Yönetimi */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary.main,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
          }}
          onPress={() => (navigation as any).navigate('WashPackageManagement')}
        >
          <Ionicons name="settings" size={20} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', ...typography.bodyBold }}>
            Yeni Paket Yönetim Ekranı
          </Text>
        </TouchableOpacity>
      </View>

      {/* Package Type Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, selectedPackageType === '' && styles.filterButtonActive]}
            onPress={() => setSelectedPackageType('')}
          >
            <Text style={[styles.filterButtonText, selectedPackageType === '' && styles.filterButtonTextActive]}>
              Tümü ({packages.length})
            </Text>
          </TouchableOpacity>
          {['basic', 'premium', 'deluxe', 'detailing', 'custom'].map((type) => {
            const count = getPackageCount(type);
            return (
            <TouchableOpacity
              key={type}
              style={[styles.filterButton, selectedPackageType === type && styles.filterButtonActive]}
              onPress={() => setSelectedPackageType(type)}
            >
              <Text style={[styles.filterButtonText, selectedPackageType === type && styles.filterButtonTextActive]}>
                {getPackageTypeText(type)} ({count})
              </Text>
            </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Category Header */}
      {selectedPackageType && (
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: getPackageTypeColor(selectedPackageType) }]}>
            <Ionicons name="pricetag" size={20} color={colors.text.inverse} />
            <Text style={styles.categoryTitle}>
              {getPackageTypeText(selectedPackageType)} Paketleri
            </Text>
          </View>
          <Text style={styles.categoryCount}>
            {filteredPackages.length} paket
          </Text>
        </View>
      )}

      {/* Packages List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredPackages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>
              {selectedPackageType 
                ? `${getPackageTypeText(selectedPackageType)} kategorisinde paket bulunamadı`
                : 'Henüz paket eklenmemiş'}
            </Text>
          </View>
        ) : (
          filteredPackages.map((pkg) => (
            <Card key={pkg._id} style={styles.packageCard}>
            <View style={styles.packageHeader}>
              <View style={styles.packageInfo}>
                <Text style={styles.packageName}>{pkg.name}</Text>
                <Text style={styles.packageDescription}>{pkg.description}</Text>
              </View>
              <View style={[styles.packageTypeBadge, { backgroundColor: getPackageTypeColor(pkg.packageType) }]}>
                <Text style={styles.packageTypeText}>{getPackageTypeText(pkg.packageType)}</Text>
              </View>
            </View>

            <View style={styles.packageDetails}>
              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Ionicons name="cash-outline" size={16} color={colors.text.secondary} />
                  <Text style={styles.priceLabel}>Başlangıç Fiyatı</Text>
                </View>
                <Text style={styles.priceValue}>{(pkg.pricing?.basePrice || pkg.basePrice || 0).toLocaleString()}₺</Text>
              </View>
              
              <View style={styles.durationContainer}>
                <View style={styles.durationRow}>
                  <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                  <Text style={styles.durationLabel}>Tahmini Süre</Text>
                </View>
                <Text style={styles.durationValue}>~{(pkg.pricing?.duration || pkg.duration || 30)} dk</Text>
              </View>

              <View style={styles.servicesContainer}>
                <Text style={styles.servicesLabel}>Hizmetler:</Text>
                {pkg.services.slice(0, 3).map((service, index) => (
                  <Text key={index} style={styles.serviceItem}>
                    • {translateServiceName(service.serviceName || service.name)}
                    {service.duration ? ` (${service.duration}dk)` : ''}
                  </Text>
                ))}
                {pkg.services.length > 3 && (
                  <Text style={styles.moreServices}>+{pkg.services.length - 3} hizmet daha</Text>
                )}
              </View>

              <View style={styles.featuresContainer}>
                {pkg.features.includesInterior && (
                  <View style={styles.featureTag}>
                    <Ionicons name="car" size={12} color={colors.primary.main} />
                    <Text style={styles.featureText}>İç Temizlik</Text>
                  </View>
                )}
                {pkg.features.includesExterior && (
                  <View style={styles.featureTag}>
                    <Ionicons name="water" size={12} color={colors.primary.main} />
                    <Text style={styles.featureText}>Dış Temizlik</Text>
                  </View>
                )}
                {pkg.features.includesEngine && (
                  <View style={styles.featureTag}>
                    <Ionicons name="settings" size={12} color={colors.primary.main} />
                    <Text style={styles.featureText}>Motor Temizliği</Text>
                  </View>
                )}
                {pkg.features.ecoFriendly && (
                  <View style={styles.featureTag}>
                    <Ionicons name="leaf" size={12} color={colors.success.main} />
                    <Text style={styles.featureText}>Çevre Dostu</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.packageActions}>
              <Button
                title="Düzenle"
                onPress={() => handleEditPackage(pkg)}
                variant="outline"
                size="medium"
                icon="create-outline"
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Kullan"
                onPress={() => handleUsePackage(pkg)}
                variant="primary"
                size="medium"
                icon="play"
                style={{ flex: 1 }}
              />
            </View>
          </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

  const renderJobs = () => (
    <View style={styles.tabContent}>
      {/* Yeni İş Yönetimi */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary.main,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            marginBottom: spacing.md,
          }}
          onPress={() => (navigation as any).navigate('WashJobs')}
        >
          <Ionicons name="list" size={20} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', ...typography.bodyBold }}>
            Detaylı İş Yönetimi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: colors.inputBackground,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          onPress={() => (navigation as any).navigate('Inventory')}
        >
          <Ionicons name="cube" size={20} color={colors.primary.main} />
          <Text style={{ color: colors.primary.main, ...typography.bodyBold }}>
            Stok Yönetimi
          </Text>
        </TouchableOpacity>
      </View>

      {/* Job Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, selectedJobStatus === '' && styles.filterButtonActive]}
            onPress={() => setSelectedJobStatus('')}
          >
            <Text style={[styles.filterButtonText, selectedJobStatus === '' && styles.filterButtonTextActive]}>
              Tümü
            </Text>
          </TouchableOpacity>
          {['pending', 'scheduled', 'in_progress', 'completed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterButton, selectedJobStatus === status && styles.filterButtonActive]}
              onPress={() => setSelectedJobStatus(status)}
            >
              <Text style={[styles.filterButtonText, selectedJobStatus === status && styles.filterButtonTextActive]}>
                {getStatusText(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Jobs List */}
      <View style={{ padding: 16 }}>
        <Button
          title="Yeni İş Yönetim Ekranına Git"
          onPress={() => (navigation as any).navigate('WashJobs')}
          icon="arrow-forward"
          style={{ marginBottom: 16 }}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {jobs.map((job) => (
          <Card key={job._id} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <View style={styles.jobInfo}>
                <Text style={styles.jobCustomer}>
                  {job.customerId.name} {job.customerId.surname}
                </Text>
                <Text style={styles.jobVehicle}>
                  {job.vehicleInfo.brand} {job.vehicleInfo.model} - {job.vehicleInfo.plateNumber}
                </Text>
                <Text style={styles.jobPackage}>{job.packageId.name}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                <Text style={styles.statusText}>{getStatusText(job.status)}</Text>
              </View>
            </View>

            <View style={styles.jobDetails}>
              <View style={styles.loyaltyInfo}>
                <View style={[styles.loyaltyBadge, { backgroundColor: getLoyaltyLevelColor(job.loyaltyInfo.customerLevel) }]}>
                  <Text style={styles.loyaltyText}>{getLoyaltyLevelText(job.loyaltyInfo.customerLevel)}</Text>
                </View>
                <Text style={styles.visitCount}>{job.loyaltyInfo.visitCount}. ziyaret</Text>
              </View>

              <View style={styles.pricingInfo}>
                <Text style={styles.finalPrice}>{job.pricing.finalPrice.toLocaleString()}₺</Text>
                {job.pricing.totalDiscount > 0 && (
                  <Text style={styles.discountText}>
                    -{job.pricing.totalDiscount.toLocaleString()}₺ indirim
                  </Text>
                )}
              </View>

              <View style={styles.servicesProgress}>
                <Text style={styles.servicesLabel}>Hizmetler:</Text>
                {job.services.map((service, index) => (
                  <View key={index} style={styles.serviceProgressItem}>
                    <Ionicons
                      name={service.completed ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={service.completed ? colors.success.main : colors.text.tertiary}
                    />
                    <Text style={[styles.serviceProgressText, service.completed && styles.serviceCompletedText]}>
                      {translateServiceName(service.serviceName)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.schedulingInfo}>
                <Text style={styles.schedulingLabel}>Tahmini Süre: {job.scheduling.estimatedDuration} dakika</Text>
                {job.scheduling.scheduledAt && (
                  <Text style={styles.schedulingLabel}>
                    Planlanan: {new Date(job.scheduling.scheduledAt).toLocaleString('tr-TR')}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.jobActions}>
              {job.status === 'pending' && (
                <Button
                  title="İşi Başlat"
                  onPress={() => handleStartJob(job._id)}
                  variant="primary"
                  size="medium"
                  icon="play-circle"
                  fullWidth
                />
              )}
              
              {job.status === 'in_progress' && (
                <Button
                  title="Detayları Gör"
                  onPress={() => {
                    setSelectedJob(job);
                    setShowJobDetailModal(true);
                  }}
                  variant="secondary"
                  size="medium"
                  icon="eye"
                  fullWidth
                />
              )}
              
              {job.status === 'completed' && (
                <Button
                  title="Tamamlandı"
                  onPress={() => {}}
                  variant="success"
                  size="medium"
                  icon="checkmark-circle"
                  fullWidth
                  disabled
                />
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );

  const renderLoyalty = () => (
    <View style={styles.tabContent}>
      {!loyaltyProgram ? (
        <Card style={styles.loyaltyCard}>
          <Ionicons name="gift-outline" size={64} color={colors.primary.main} style={{ alignSelf: 'center', marginBottom: spacing.md }} />
          <Text style={styles.cardTitle}>Sadakat Programı</Text>
          <Text style={styles.cardDescription}>
            Müşterilerinizi ödüllendirin ve sadakatlerini artırın. Otomatik indirimler, özel kampanyalar ve puan sistemi ile müşteri memnuniyetini üst düzeye çıkarın.
          </Text>
          <Button
            title="Programı Kur"
            onPress={() => {
              initializeDefaultLoyaltyProgram();
              setIsSetupLoyaltyModalVisible(true);
            }}
            variant="primary"
            size="large"
            icon="gift"
            fullWidth
          />
        </Card>
      ) : (
        <>
          <Card style={styles.loyaltyProgramCard}>
            <View style={styles.loyaltyHeader}>
              <View>
                <Text style={styles.cardTitle}>{loyaltyProgram.programName}</Text>
                <Text style={styles.cardDescription}>{loyaltyProgram.description}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setTempLoyaltyProgram(loyaltyProgram);
                  setIsSetupLoyaltyModalVisible(true);
                }}
                style={styles.editIconButton}
              >
                <Ionicons name="create-outline" size={24} color={colors.primary.main} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.loyaltyLevelsContainer}>
              <Text style={styles.sectionTitle}>Sadakat Seviyeleri</Text>
              {loyaltyProgram.loyaltyLevels?.map((level: any, index: number) => (
                <View key={index} style={[styles.levelCard, { borderLeftColor: level.color }]}>
                  <View style={styles.levelHeader}>
                    <Ionicons name={level.icon as any} size={20} color={level.color} />
                    <Text style={[styles.levelName, { color: level.color }]}>{level.levelName}</Text>
                  </View>
                  <Text style={styles.levelRequirement}>
                    Min. {level.minVisits} ziyaret • Min. {level.minSpent}₺ harcama
                  </Text>
                  <Text style={styles.levelBenefit}>
                    %{level.benefits.discountPercentage} İndirim
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}

      <Card style={styles.loyaltyStatsCard}>
        <Text style={styles.cardTitle}>Sadakat İstatistikleri</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.activeCustomers}</Text>
            <Text style={styles.statLabel}>Aktif Müşteri</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.vipCustomers}</Text>
            <Text style={styles.statLabel}>VIP Müşteri</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalVisits}</Text>
            <Text style={styles.statLabel}>Toplam Ziyaret</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalEarnings.toLocaleString()}₺</Text>
            <Text style={styles.statLabel}>Toplam Kazanç</Text>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderMobileWash = () => {
    const activeMobileJobs = mobileJobs.filter(job => ['pending', 'accepted', 'in_progress'].includes(job.status));
    const historyMobileJobs = mobileJobs.filter(job => ['completed', 'cancelled'].includes(job.status));
    const displayJobs = mobileJobFilter === 'active' ? activeMobileJobs : historyMobileJobs;

    return (
      <View style={styles.tabContent}>
        {/* Filter */}
        <View style={styles.mobileFilterContainer}>
          <TouchableOpacity
            style={[styles.mobileFilterButton, mobileJobFilter === 'active' && styles.mobileFilterButtonActive]}
            onPress={() => setMobileJobFilter('active')}
          >
            <Text style={[styles.mobileFilterButtonText, mobileJobFilter === 'active' && styles.mobileFilterButtonTextActive]}>
              Aktif İşler ({activeMobileJobs.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mobileFilterButton, mobileJobFilter === 'history' && styles.mobileFilterButtonActive]}
            onPress={() => setMobileJobFilter('history')}
          >
            <Text style={[styles.mobileFilterButtonText, mobileJobFilter === 'history' && styles.mobileFilterButtonTextActive]}>
              Geçmiş ({historyMobileJobs.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mobile Jobs List */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {displayJobs.length > 0 ? (
            displayJobs.map((job) => (
              <Card key={job.id} style={styles.mobileJobCard}>
                {/* Yıkama Türü ve Seviye Badge'leri */}
                <View style={styles.washTypeContainer}>
                  <View style={[styles.washTypeBadge, { backgroundColor: getMobileWashTypeColor(job.washType) }]}>
                    <Ionicons name="water" size={14} color="#FFFFFF" />
                    <Text style={styles.washTypeText}>{getMobileWashTypeText(job.washType)}</Text>
                  </View>
                  <View style={[styles.washLevelBadge, { backgroundColor: getMobileWashLevelColor(job.washLevel) }]}>
                    <Text style={styles.washLevelText}>{getMobileWashLevelText(job.washLevel)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getMobileStatusColor(job.status) }]}>
                    <Text style={styles.statusText}>{getMobileStatusText(job.status)}</Text>
                  </View>
                </View>

                {/* Müşteri Bilgileri */}
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{job.customerName}</Text>
                  <Text style={styles.customerPhone}>{job.customerPhone}</Text>
                </View>

                {/* Araç Detayları */}
                <View style={styles.vehicleDetails}>
                  <View style={styles.vehicleRow}>
                    <Ionicons name="car" size={16} color={colors.text.secondary} />
                    <Text style={styles.vehicleText}>{job.vehicleBrand} {job.vehicleModel}</Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Ionicons name="calendar" size={16} color={colors.text.secondary} />
                    <Text style={styles.vehicleText}>{job.vehicleYear}</Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Ionicons name="card" size={16} color={colors.text.secondary} />
                    <Text style={styles.vehicleText}>{job.vehiclePlate}</Text>
                  </View>
                </View>

                {/* Konum Bilgisi */}
                <View style={styles.locationInfo}>
                  <TouchableOpacity 
                    style={styles.locationRow}
                    onPress={() => {
                      const { lat, lng } = job.location.coordinates;
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                      Linking.openURL(url);
                    }}
                  >
                    <Ionicons name="location" size={16} color={colors.primary.main} />
                    <Text style={styles.locationText}>{job.location.address}</Text>
                    <Ionicons name="open-outline" size={14} color={colors.primary.main} />
                  </TouchableOpacity>
                </View>

                {/* Hizmetler Listesi */}
                {job.services && job.services.length > 0 && (
                  <View style={styles.servicesContainer}>
                    <Text style={styles.servicesLabel}>Hizmetler:</Text>
                    {job.services.map((service, index) => (
                      <View key={index} style={styles.serviceItem}>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceName}>{service.name}</Text>
                          <Text style={styles.serviceDuration}>{service.duration} dk</Text>
                        </View>
                        <View style={styles.servicePriceContainer}>
                          <Text style={styles.servicePrice}>{service.price} TL</Text>
                          {service.completed && (
                            <Ionicons name="checkmark-circle" size={16} color={colors.success.main} />
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Özel İstekler */}
                {job.specialRequests && job.specialRequests.length > 0 && (
                  <View style={styles.specialRequestsContainer}>
                    <Text style={styles.specialRequestsTitle}>Özel İstekler:</Text>
                    {job.specialRequests.map((request, index) => (
                      <Text key={index} style={styles.specialRequestText}>• {request}</Text>
                    ))}
                  </View>
                )}

                {/* İş Detayları */}
                <View style={styles.jobDetailsContainer}>
                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={14} color={colors.text.secondary} />
                    <Text style={styles.detailText}>{job.estimatedTime}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="cash" size={14} color={colors.text.secondary} />
                    <Text style={styles.detailText}>{job.price} TL</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={14} color={colors.text.secondary} />
                    <Text style={styles.detailText}>{new Date(job.requestedAt).toLocaleDateString('tr-TR')}</Text>
                  </View>
                </View>

                {/* Notlar */}
                {job.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>{job.notes}</Text>
                  </View>
                )}

                {/* Aksiyon Butonları */}
                <View style={styles.actionButtonsContainer}>
                  {job.status === 'pending' && (
                    <>
                      <Button
                        title="Kabul Et"
                        onPress={() => handleMobileJobAction(job.id, 'accept')}
                        variant="success"
                        size="medium"
                        icon="checkmark-circle"
                        style={{ flex: 1, marginRight: spacing.sm }}
                      />
                      <Button
                        title="Reddet"
                        onPress={() => handleMobileJobAction(job.id, 'cancel')}
                        variant="outline"
                        size="medium"
                        icon="close-circle"
                        style={{ flex: 1 }}
                      />
                    </>
                  )}
                  {job.status === 'accepted' && (
                    <Button
                      title="İşi Başlat"
                      onPress={() => handleMobileJobAction(job.id, 'start')}
                      variant="primary"
                      size="medium"
                      icon="play-circle"
                      fullWidth
                    />
                  )}
                  {job.status === 'in_progress' && (
                    <Button
                      title="İşi Tamamla"
                      onPress={() => handleMobileJobAction(job.id, 'complete')}
                      variant="success"
                      size="medium"
                      icon="checkmark-done"
                      fullWidth
                    />
                  )}
                </View>

                {/* Hızlı Aksiyonlar */}
                <View style={styles.quickActions}>
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={() => Linking.openURL(`tel:${job.customerPhone}`)}
                  >
                    <Ionicons name="call" size={16} color={colors.primary.main} />
                    <Text style={styles.quickActionText}>Ara</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={() => {
                      const { lat, lng } = job.location.coordinates;
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                      Linking.openURL(url);
                    }}
                  >
                    <Ionicons name="map" size={16} color={colors.primary.main} />
                    <Text style={styles.quickActionText}>Harita</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="water-outline" size={64} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>
                {mobileJobFilter === 'active' ? 'Aktif mobil yıkama işi yok' : 'Geçmiş iş yok'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {mobileJobFilter === 'active' ? 'Yeni işler geldiğinde burada görünecek' : 'Tamamlanan işler burada görünecek'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderCreatePackageModal = () => (
    <Modal
      visible={showCreatePackageModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {editingPackage ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}
          </Text>
          <TouchableOpacity onPress={() => {
            setShowCreatePackageModal(false);
            resetPackageForm();
          }}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Paket Adı</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Örn: Premium Yıkama Paketi"
              value={packageForm.name}
              onChangeText={(text) => setPackageForm({ ...packageForm, name: text })}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Açıklama</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              placeholder="Paket içeriğini açıklayın..."
              value={packageForm.description}
              onChangeText={(text) => setPackageForm({ ...packageForm, description: text })}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Paket Tipi</Text>
            <View style={styles.packageTypeButtons}>
              {['basic', 'premium', 'deluxe', 'detailing', 'custom'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.packageTypeButton,
                    packageForm.packageType === type && styles.packageTypeButtonActive,
                    { backgroundColor: packageForm.packageType === type ? getPackageTypeColor(type) : colors.background.secondary }
                  ]}
                  onPress={() => setPackageForm({ ...packageForm, packageType: type as any })}
                >
                  <Text style={[
                    styles.packageTypeButtonText,
                    packageForm.packageType === type && styles.packageTypeButtonTextActive
                  ]}>
                    {getPackageTypeText(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Temel Fiyat (₺)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="0"
              value={packageForm.basePrice.toString()}
              onChangeText={(text) => setPackageForm({ ...packageForm, basePrice: parseFloat(text) || 0 })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Tahmini Süre (Dakika)</Text>
            <View style={styles.durationInputContainer}>
              <TextInput
                style={styles.formInput}
                placeholder="30"
                value={packageForm.estimatedDuration.toString()}
                onChangeText={(text) => setPackageForm({ ...packageForm, estimatedDuration: parseInt(text) || 30 })}
                keyboardType="numeric"
              />
              <View style={styles.durationSuggestions}>
                {[15, 30, 45, 60, 90, 120].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationChip,
                      packageForm.estimatedDuration === duration && styles.durationChipActive
                    ]}
                    onPress={() => setPackageForm({ ...packageForm, estimatedDuration: duration })}
                  >
                    <Text style={[
                      styles.durationChipText,
                      packageForm.estimatedDuration === duration && styles.durationChipTextActive
                    ]}>
                      {duration}dk
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={styles.formHelperText}>
              Paketin tamamlanması için yaklaşık süreyi belirleyin
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Özellikler</Text>
            <View style={styles.featuresCheckboxContainer}>
              {Object.keys(packageForm.features).map((feature) => (
                <TouchableOpacity
                  key={feature}
                  style={styles.checkboxRow}
                  onPress={() => setPackageForm({
                    ...packageForm,
                    features: {
                      ...packageForm.features,
                      [feature]: !packageForm.features[feature as keyof typeof packageForm.features]
                    }
                  })}
                >
                  <Ionicons
                    name={packageForm.features[feature as keyof typeof packageForm.features] ? "checkbox" : "square-outline"}
                    size={24}
                    color={colors.primary.main}
                  />
                  <Text style={styles.checkboxLabel}>
                    {feature === 'includesInterior' ? 'İç Temizlik' :
                     feature === 'includesExterior' ? 'Dış Temizlik' :
                     feature === 'includesEngine' ? 'Motor Temizliği' :
                     feature === 'includesWaxing' ? 'Cila' :
                     feature === 'includesPolishing' ? 'Pasta' :
                     feature === 'includesDetailing' ? 'Detaylı Temizlik' :
                     feature === 'ecoFriendly' ? 'Çevre Dostu' :
                     feature === 'premiumProducts' ? 'Premium Ürünler' : feature}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <Button
            title="İptal"
            onPress={() => {
              setShowCreatePackageModal(false);
              resetPackageForm();
            }}
            variant="outline"
            size="large"
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            title={editingPackage ? 'Güncelle' : 'Oluştur'}
            onPress={handleCreatePackage}
            variant="primary"
            size="large"
            icon={editingPackage ? "save" : "add-circle"}
            style={{ flex: 1 }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderLoyaltyProgramModal = () => (
    <Modal
      visible={isSetupLoyaltyModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Sadakat Programı Kurulumu</Text>
          <TouchableOpacity onPress={() => setIsSetupLoyaltyModalVisible(false)}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {tempLoyaltyProgram && (
            <>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Program Adı</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Örn: Yıkama Sadakat Programı"
                  value={tempLoyaltyProgram.programName}
                  onChangeText={(text) => setTempLoyaltyProgram({ ...tempLoyaltyProgram, programName: text })}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Açıklama</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Programın açıklaması..."
                  value={tempLoyaltyProgram.description}
                  onChangeText={(text) => setTempLoyaltyProgram({ ...tempLoyaltyProgram, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Sadakat Seviyeleri</Text>
                {tempLoyaltyProgram.loyaltyLevels?.map((level: any, index: number) => (
                  <View key={index} style={[styles.levelCard, { borderLeftColor: level.color }]}>
                    <View style={styles.levelHeader}>
                      <Ionicons name={level.icon as any} size={20} color={level.color} />
                      <Text style={[styles.levelName, { color: level.color }]}>{level.levelName}</Text>
                    </View>
                    <View style={styles.levelInputs}>
                      <View style={styles.levelInputGroup}>
                        <Text style={styles.levelInputLabel}>Min. Ziyaret:</Text>
                        <TextInput
                          style={styles.levelInput}
                          value={level.minVisits.toString()}
                          onChangeText={(text) => {
                            const updatedLevels = [...tempLoyaltyProgram.loyaltyLevels];
                            updatedLevels[index].minVisits = parseInt(text) || 0;
                            setTempLoyaltyProgram({ ...tempLoyaltyProgram, loyaltyLevels: updatedLevels });
                          }}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.levelInputGroup}>
                        <Text style={styles.levelInputLabel}>Min. Harcama (₺):</Text>
                        <TextInput
                          style={styles.levelInput}
                          value={level.minSpent.toString()}
                          onChangeText={(text) => {
                            const updatedLevels = [...tempLoyaltyProgram.loyaltyLevels];
                            updatedLevels[index].minSpent = parseInt(text) || 0;
                            setTempLoyaltyProgram({ ...tempLoyaltyProgram, loyaltyLevels: updatedLevels });
                          }}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.levelInputGroup}>
                        <Text style={styles.levelInputLabel}>İndirim (%):</Text>
                        <TextInput
                          style={styles.levelInput}
                          value={level.benefits.discountPercentage.toString()}
                          onChangeText={(text) => {
                            const updatedLevels = [...tempLoyaltyProgram.loyaltyLevels];
                            updatedLevels[index].benefits.discountPercentage = parseInt(text) || 0;
                            setTempLoyaltyProgram({ ...tempLoyaltyProgram, loyaltyLevels: updatedLevels });
                          }}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.formSection}>
                <View style={styles.checkboxRow}>
                  <Ionicons
                    name={tempLoyaltyProgram.isActive ? "checkbox" : "square-outline"}
                    size={24}
                    color={colors.primary.main}
                  />
                  <Text style={styles.checkboxLabel}>Programı Aktif Et</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <Button
            title="İptal"
            onPress={() => setIsSetupLoyaltyModalVisible(false)}
            variant="outline"
            size="large"
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            title="Kaydet"
            onPress={handleSetupLoyaltyProgram}
            variant="primary"
            size="large"
            icon="save"
            style={{ flex: 1 }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderJobDetailModal = () => (
    <Modal
      visible={showJobDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Yıkama Detayları</Text>
          <TouchableOpacity onPress={() => setShowJobDetailModal(false)}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {selectedJob && (
            <>
              <View style={styles.jobDetailSection}>
                <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
                <Text style={styles.detailText}>
                  {selectedJob.customerId.name} {selectedJob.customerId.surname}
                </Text>
                <Text style={styles.detailText}>{selectedJob.customerId.phone}</Text>
              </View>

              <View style={styles.jobDetailSection}>
                <Text style={styles.sectionTitle}>Araç Bilgileri</Text>
                <Text style={styles.detailText}>
                  {selectedJob.vehicleInfo.brand} {selectedJob.vehicleInfo.model} ({selectedJob.vehicleInfo.year})
                </Text>
                <Text style={styles.detailText}>Plaka: {selectedJob.vehicleInfo.plateNumber}</Text>
                <Text style={styles.detailText}>Renk: {selectedJob.vehicleInfo.color}</Text>
              </View>

              <View style={styles.jobDetailSection}>
                <Text style={styles.sectionTitle}>Hizmetler</Text>
                {selectedJob.services.map((service, index) => (
                  <View key={index} style={styles.serviceDetailItem}>
                    <View style={styles.serviceDetailHeader}>
                      <Text style={styles.serviceDetailName}>{translateServiceName(service.serviceName)}</Text>
                      <Ionicons
                        name={service.completed ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={service.completed ? colors.success.main : colors.text.tertiary}
                      />
                    </View>
                    <Text style={styles.serviceDetailInfo}>
                      {service.duration} dakika • {service.price}₺
                    </Text>
                    {service.completed && (
                      <Button
                        title="Tamamlandı"
                        onPress={() => {}}
                        variant="success"
                        size="small"
                        icon="checkmark-circle"
                        disabled
                      />
                    )}
                    {!service.completed && selectedJob.status === 'in_progress' && (
                      <Button
                        title="Tamamla"
                        onPress={() => handleCompleteService(selectedJob._id, service.serviceName)}
                        variant="primary"
                        size="small"
                        icon="checkmark"
                      />
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.jobDetailSection}>
                <Text style={styles.sectionTitle}>Fiyat Bilgileri</Text>
                <View style={styles.pricingDetail}>
                  <Text style={styles.pricingDetailText}>
                    Temel Fiyat: {selectedJob.pricing.basePrice.toLocaleString()}₺
                  </Text>
                  <Text style={styles.pricingDetailText}>
                    Araç Çarpanı: {selectedJob.pricing.vehicleMultiplier}x
                  </Text>
                  {selectedJob.pricing.loyaltyDiscountAmount > 0 && (
                    <Text style={styles.pricingDetailText}>
                      Sadakat İndirimi: -{selectedJob.pricing.loyaltyDiscountAmount.toLocaleString()}₺
                    </Text>
                  )}
                  <Text style={styles.pricingDetailText}>
                    Toplam İndirim: -{selectedJob.pricing.totalDiscount.toLocaleString()}₺
                  </Text>
                  <Text style={styles.finalPriceText}>
                    Final Fiyat: {selectedJob.pricing.finalPrice.toLocaleString()}₺
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
        
        <View style={styles.modalFooter}>
          {selectedJob?.status === 'in_progress' && (
            <Button
              title="İşi Tamamla"
              onPress={() => selectedJob && handleCompleteJob(selectedJob._id)}
              variant="success"
              size="large"
              icon="checkmark-done"
              style={{ flex: 1, marginRight: spacing.sm }}
            />
          )}
          <Button
            title="Kapat"
            onPress={() => setShowJobDetailModal(false)}
            variant="outline"
            size="large"
            style={{ flex: selectedJob?.status === 'in_progress' ? 1 : undefined }}
            fullWidth={selectedJob?.status !== 'in_progress'}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yıkama Hizmetleri</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('WashProviderSetup')}
            style={{ padding: 4 }}
          >
            <Ionicons name="settings" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity         onPress={() => {
          if (activeTab === 'packages') {
            // Yeni paket yönetim ekranına git
            (navigation as any).navigate('WashPackageManagement');
          } else if (activeTab === 'jobs') {
            setShowCreateJobModal(true);
          } else if (activeTab === 'mobile') {
            Alert.alert('Bilgi', 'Mobil yıkama işleri müşteri uygulamasından gelir');
          } else if (activeTab === 'loyalty') {
            setShowLoyaltyModal(true);
          }
        }}>
          <Ionicons name="add" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'packages' && styles.tabButtonActive]}
          onPress={() => setActiveTab('packages')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'packages' && styles.tabButtonTextActive]}>
            Paketler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'jobs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('jobs')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'jobs' && styles.tabButtonTextActive]}>
            İşler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'mobile' && styles.tabButtonActive]}
          onPress={() => setActiveTab('mobile')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'mobile' && styles.tabButtonTextActive]}>
            Mobil
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'loyalty' && styles.tabButtonActive]}
          onPress={() => setActiveTab('loyalty')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'loyalty' && styles.tabButtonTextActive]}>
            Sadakat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'packages' && renderPackages()}
        {activeTab === 'jobs' && renderJobs()}
        {activeTab === 'mobile' && renderMobileWash()}
        {activeTab === 'loyalty' && renderLoyalty()}
      </ScrollView>

      {/* Modals */}
      {renderCreatePackageModal()}
      {renderLoyaltyProgramModal()}
      {renderJobDetailModal()}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.background.primary,
  },
  headerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.background.primary,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
    ...shadows.small,
  },
  tabButtonActive: {
    backgroundColor: colors.primary.main,
    ...shadows.medium,
  },
  tabButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.secondary,
  },
  tabButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: spacing.lg,
  },
  filterContainer: {
    marginBottom: spacing.lg,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
    marginRight: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
    ...shadows.small,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
    ...shadows.medium,
  },
  filterButtonText: {
    fontSize: typography.body3.fontSize,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.secondary,
  },
  filterButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  categoryTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.inverse,
    marginLeft: spacing.sm,
  },
  categoryCount: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  packageCard: {
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  packageInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  packageName: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  packageDescription: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    lineHeight: typography.body3.lineHeight,
    marginTop: spacing.xs,
  },
  packageTypeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    ...shadows.small,
  },
  packageTypeText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  packageDetails: {
    marginBottom: spacing.md,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceLabel: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    fontWeight: typography.fontWeights.medium,
  },
  priceValue: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    color: colors.primary.main,
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  durationLabel: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    fontWeight: typography.fontWeights.medium,
  },
  durationValue: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  servicesContainer: {
    marginBottom: spacing.sm,
  },
  servicesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  serviceItem: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
  moreServices: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  packageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  jobCard: {
    marginBottom: spacing.lg,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  jobInfo: {
    flex: 1,
  },
  jobCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  jobVehicle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  jobPackage: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    ...shadows.small,
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobDetails: {
    marginBottom: spacing.md,
  },
  loyaltyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  loyaltyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  loyaltyText: {
    fontSize: 12,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  visitCount: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  pricingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  finalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary.main,
  },
  discountText: {
    fontSize: 12,
    color: colors.success.main,
  },
  servicesProgress: {
    marginBottom: spacing.sm,
  },
  serviceProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  serviceProgressText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  serviceCompletedText: {
    textDecorationLine: 'line-through',
    color: colors.success.main,
  },
  schedulingInfo: {
    marginTop: spacing.sm,
  },
  schedulingLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: spacing.xs / 2,
  },
  jobActions: {
    marginTop: spacing.md,
  },
  loyaltyCard: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loyaltyStatsCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  cardDescription: {
    fontSize: typography.body2.fontSize,
    lineHeight: typography.body2.lineHeight,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    ...shadows.small,
  },
  statValue: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.primary.main,
  },
  statLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.background.primary,
  },
  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  jobDetailSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  serviceDetailItem: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  serviceDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  serviceDetailName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  serviceDetailInfo: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  pricingDetail: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  pricingDetailText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  finalPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary.main,
    marginTop: spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    backgroundColor: colors.background.primary,
    gap: spacing.sm,
  },
  // Mobile Wash Styles
  mobileFilterContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  mobileFilterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  mobileFilterButtonActive: {
    backgroundColor: colors.primary.main,
  },
  mobileFilterButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  mobileFilterButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  mobileJobCard: {
    marginBottom: spacing.lg,
  },
  washTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  washTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  washTypeText: {
    fontSize: 12,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  washLevelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  washLevelText: {
    fontSize: 12,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  customerInfo: {
    marginBottom: spacing.md,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  customerPhone: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  vehicleDetails: {
    marginBottom: spacing.md,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  vehicleText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  locationInfo: {
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: 14,
    color: colors.primary.main,
    flex: 1,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    color: colors.text.primary,
  },
  serviceDuration: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.xs / 2,
  },
  servicePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  specialRequestsContainer: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
  },
  specialRequestsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  specialRequestText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
  jobDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  notesContainer: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
  },
  notesText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.lg,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickActionText: {
    fontSize: 14,
    color: colors.primary.main,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  // Form styles
  formSection: {
    marginBottom: spacing.xl,
  },
  formLabel: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1.5,
    borderColor: colors.border.secondary,
    borderRadius: borderRadius.input,
    padding: spacing.md,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    minHeight: dimensions.inputHeight,
    ...shadows.small,
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  formHelperText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  durationInputContainer: {
    gap: spacing.md,
  },
  durationSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  durationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
    borderWidth: 1.5,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
    minWidth: 60,
    alignItems: 'center',
    ...shadows.small,
  },
  durationChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
    ...shadows.medium,
  },
  durationChipText: {
    fontSize: typography.body3.fontSize,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.secondary,
  },
  durationChipTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
  },
  packageTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  packageTypeButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    borderWidth: 1.5,
    borderColor: colors.border.secondary,
    ...shadows.small,
  },
  packageTypeButtonActive: {
    borderColor: 'transparent',
    ...shadows.medium,
  },
  packageTypeButtonText: {
    fontSize: typography.body3.fontSize,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.secondary,
  },
  packageTypeButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
  },
  featuresCheckboxContainer: {
    gap: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text.primary,
  },
  // Loyalty program styles
  loyaltyProgramCard: {
    marginBottom: spacing.lg,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  editIconButton: {
    padding: spacing.xs,
  },
  loyaltyLevelsContainer: {
    marginTop: spacing.md,
  },
  levelCard: {
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    borderLeftWidth: 5,
    ...shadows.card,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  levelName: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
  },
  levelRequirement: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  levelBenefit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  levelInputs: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  levelInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelInputLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  levelInput: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text.primary,
    minWidth: 80,
    textAlign: 'right',
  },
});

export default CarWashScreen;
