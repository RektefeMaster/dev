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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, shadows, dimensions } from '@/shared/theme';
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
  const [activeTab, setActiveTab] = useState<'packages' | 'jobs' | 'loyalty'>('packages');
  
  // Packages
  const [packages, setPackages] = useState<CarWashPackage[]>([]);
  const [selectedPackageType, setSelectedPackageType] = useState<string>('');
  
  // Jobs
  const [jobs, setJobs] = useState<CarWashJob[]>([]);
  const [selectedJobStatus, setSelectedJobStatus] = useState<string>('');
  
  // Modals
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showJobDetailModal, setShowJobDetailModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CarWashJob | null>(null);
  
  // Create package form
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    packageType: 'basic' as 'basic' | 'premium' | 'deluxe' | 'detailing' | 'custom',
    basePrice: 0,
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
      }
      
    } catch (error) {
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await apiService.CarWashService.getCarWashPackages(selectedPackageType);
      if (response.success) {
        setPackages(response.data || []);
      } else {
        Alert.alert('Hata', 'Paketler yüklenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Paketler yüklenirken bir hata oluştu');
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await apiService.CarWashService.getCarWashJobs(selectedJobStatus);
      if (response.success) {
        setJobs(response.data || []);
      } else {
        Alert.alert('Hata', 'Yıkama işleri yüklenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Yıkama işleri yüklenirken bir hata oluştu');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCreatePackage = async () => {
    try {
      if (!packageForm.name || !packageForm.description || packageForm.services.length === 0) {
        Alert.alert('Hata', 'Lütfen tüm gerekli alanları doldurun');
        return;
      }

      const response = await apiService.CarWashService.createCarWashPackage(packageForm);
      if (response.success) {
        Alert.alert('Başarılı', 'Paket başarıyla oluşturuldu');
        setShowCreatePackageModal(false);
        resetPackageForm();
        await fetchPackages();
      } else {
        Alert.alert('Hata', response.message || 'Paket oluşturulamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Paket oluşturulurken bir hata oluştu');
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
  };

  const handleSetupLoyaltyProgram = async () => {
    if (!tempLoyaltyProgram?.programName || tempLoyaltyProgram.loyaltyLevels.length === 0) {
      Alert.alert('Uyarı', 'Lütfen program adını ve en az bir sadakat seviyesini doldurun.');
      return;
    }

    try {
      const response = await apiService.CarWashService.setupLoyaltyProgram(tempLoyaltyProgram);
      if (response.success) {
        Alert.alert('Başarılı', 'Sadakat programı başarıyla yapılandırıldı.');
        setIsSetupLoyaltyModalVisible(false);
        onRefresh();
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

  const renderPackages = () => (
    <View style={styles.tabContent}>
      {/* Package Type Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, selectedPackageType === '' && styles.filterButtonActive]}
            onPress={() => setSelectedPackageType('')}
          >
            <Text style={[styles.filterButtonText, selectedPackageType === '' && styles.filterButtonTextActive]}>
              Tümü
            </Text>
          </TouchableOpacity>
          {['basic', 'premium', 'deluxe', 'detailing', 'custom'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterButton, selectedPackageType === type && styles.filterButtonActive]}
              onPress={() => setSelectedPackageType(type)}
            >
              <Text style={[styles.filterButtonText, selectedPackageType === type && styles.filterButtonTextActive]}>
                {getPackageTypeText(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Packages List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {packages.map((pkg) => (
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
                <Text style={styles.priceLabel}>Başlangıç Fiyatı</Text>
                <Text style={styles.priceValue}>{pkg.pricing.basePrice.toLocaleString()}₺</Text>
              </View>
              
              <View style={styles.durationContainer}>
                <Text style={styles.durationLabel}>Süre</Text>
                <Text style={styles.durationValue}>{pkg.pricing.duration} dakika</Text>
              </View>

              <View style={styles.servicesContainer}>
                <Text style={styles.servicesLabel}>Hizmetler:</Text>
                {pkg.services.slice(0, 3).map((service, index) => (
                  <Text key={index} style={styles.serviceItem}>
                    • {service.serviceName} ({service.duration}dk)
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
                onPress={() => Alert.alert('Düzenle', 'Paket düzenleme özelliği yakında eklenecek')}
                style={styles.editButton}
                textStyle={styles.editButtonText}
              />
              <Button
                title="Yıkama Başlat"
                onPress={() => Alert.alert('Yıkama', 'Yıkama başlatma özelliği yakında eklenecek')}
                style={styles.startButton}
              />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );

  const renderJobs = () => (
    <View style={styles.tabContent}>
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
                      {service.serviceName}
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
                  title="Başlat"
                  onPress={() => handleStartJob(job._id)}
                  style={styles.startButton}
                />
              )}
              
              {job.status === 'in_progress' && (
                <Button
                  title="Detayları Görüntüle"
                  onPress={() => {
                    setSelectedJob(job);
                    setShowJobDetailModal(true);
                  }}
                  style={styles.detailButton}
                />
              )}
              
              {job.status === 'completed' && (
                <Button
                  title="Tamamlandı"
                  onPress={() => {}}
                  style={styles.completedButton}
                  textStyle={styles.completedButtonText}
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
      <Card style={styles.loyaltyCard}>
        <Text style={styles.cardTitle}>Sadakat Programı</Text>
        <Text style={styles.cardDescription}>
          Müşteri sadakat programınızı yönetin ve özel kampanyalar oluşturun.
        </Text>
        <Button
          title="Sadakat Programı Kur"
          onPress={() => setShowLoyaltyModal(true)}
          style={styles.primaryButton}
        />
      </Card>

      <Card style={styles.loyaltyStatsCard}>
        <Text style={styles.cardTitle}>Sadakat İstatistikleri</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Aktif Müşteri</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>VIP Müşteri</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>156</Text>
            <Text style={styles.statLabel}>Toplam Ziyaret</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12,450₺</Text>
            <Text style={styles.statLabel}>Toplam Kazanç</Text>
          </View>
        </View>
      </Card>
    </View>
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
                      <Text style={styles.serviceDetailName}>{service.serviceName}</Text>
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
                        style={styles.completedServiceButton}
                        textStyle={styles.completedServiceButtonText}
                      />
                    )}
                    {!service.completed && selectedJob.status === 'in_progress' && (
                      <Button
                        title="Tamamla"
                        onPress={() => handleCompleteService(selectedJob._id, service.serviceName)}
                        style={styles.completeServiceButton}
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
              style={styles.completeJobButton}
            />
          )}
          <Button
            title="Kapat"
            onPress={() => setShowJobDetailModal(false)}
            style={[styles.modalButton, styles.cancelButton]}
            textStyle={styles.cancelButtonText}
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
        <Text style={styles.headerTitle}>Oto Yıkama</Text>
        <TouchableOpacity onPress={() => {
          if (activeTab === 'packages') {
            setShowCreatePackageModal(true);
          } else if (activeTab === 'jobs') {
            setShowCreateJobModal(true);
          }
        }}>
          <Ionicons name="add" size={24} color={colors.text.primary} />
        </TouchableOpacity>
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
        {activeTab === 'loyalty' && renderLoyalty()}
      </ScrollView>

      {/* Modals */}
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
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: colors.primary.main,
  },
  tabButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  tabButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  filterButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  packageCard: {
    marginBottom: spacing.lg,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  packageDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  packageTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  packageTypeText: {
    fontSize: 12,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  packageDetails: {
    marginBottom: spacing.md,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary.main,
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  durationLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  durationValue: {
    fontSize: 14,
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
  },
  editButton: {
    flex: 1,
    marginRight: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  editButtonText: {
    color: colors.text.secondary,
  },
  startButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    color: colors.text.inverse,
    fontWeight: '600',
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
  detailButton: {
    backgroundColor: colors.info.main,
  },
  completedButton: {
    backgroundColor: colors.success.main,
  },
  completedButtonText: {
    color: colors.text.inverse,
  },
  loyaltyCard: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loyaltyStatsCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  cardDescription: {
    fontSize: 14,
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
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary.main,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  completedServiceButton: {
    backgroundColor: colors.success.main,
    paddingVertical: spacing.xs,
  },
  completedServiceButtonText: {
    fontSize: 12,
    color: colors.text.inverse,
  },
  completeServiceButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.xs,
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
    borderTopColor: colors.border.light,
  },
  completeJobButton: {
    flex: 1,
    marginRight: spacing.sm,
    backgroundColor: colors.success.main,
  },
  modalButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  cancelButtonText: {
    color: colors.text.secondary,
  },
});
