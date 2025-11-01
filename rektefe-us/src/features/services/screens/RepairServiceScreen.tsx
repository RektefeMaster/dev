import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useNavigationState } from '@react-navigation/native';
import { serviceNameMapping } from '@/shared/utils/serviceTranslator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface RepairJob {
  _id: string;
  customerId: {
    name: string;
    surname: string;
    phone: string;
  };
  vehicleId: {
    brand: string;
    modelName: string;
    plateNumber: string;
  };
  serviceType: string;
  description: string;
  photos: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  estimatedDuration: string;
  price: number;
  location: {
    address: string;
    city: string;
    coordinates: [number, number];
  };
  scheduledDate: string;
  createdAt: string;
  updatedAt: string;
}

export default function RepairServiceScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'in_progress' | 'completed'>('all');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [repairPrice, setRepairPrice] = useState('');
  const [scaleAnim] = useState(new Animated.Value(1));

  // Route name'i al ve kategoriyi tespit et
  const routeName = useNavigationState(state => {
    const route = state?.routes[state.index];
    return route?.name;
  });

  // Route name'den kategoriyi belirle
  const targetCategory = React.useMemo(() => {
    if (routeName === 'RepairService') return 'repair';
    if (routeName === 'ElectricalService') return 'electrical';
    if (routeName === 'PartsService') return 'parts';
    return 'repair'; // default
  }, [routeName]);

  // Kategori bilgisini al
  const categoryInfo = React.useMemo(() => {
    const info: { title: string; icon: string; color: string; gradientColors: string[]; serviceTypes: string[] } = {
      title: 'Tamir & Bakım',
      icon: 'construct',
      color: '#3B82F6',
      gradientColors: ['#3B82F6', '#2563EB'],
      serviceTypes: []
    };

    if (targetCategory === 'repair') {
      info.title = 'Tamir & Bakım';
      info.icon = 'construct';
      info.color = '#3B82F6';
      info.gradientColors = ['#3B82F6', '#2563EB'];
      // Repair kategorisi: genel-bakim, agir-bakim, alt-takim, ust-takim, egzoz-emisyon
      info.serviceTypes = ['genel-bakim', 'agir-bakim', 'alt-takim', 'ust-takim', 'egzoz-emisyon'];
    } else if (targetCategory === 'electrical') {
      info.title = 'Elektrik & Elektronik';
      info.icon = 'flask';
      info.color = '#F97316';
      info.gradientColors = ['#F97316', '#EA580C'];
      // Electrical kategorisi
      info.serviceTypes = ['elektrik-elektronik'];
    } else if (targetCategory === 'parts') {
      info.title = 'Yedek Parça';
      info.icon = 'settings';
      info.color = '#6366F1';
      info.gradientColors = ['#6366F1', '#4F46E5'];
      // Parts kategorisi
      info.serviceTypes = ['yedek-parca'];
    }

    return info;
  }, [targetCategory]);

  const fetchRepairJobs = async (showLoading = true) => {
    try {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }
      
      const response = await apiService.getMechanicAppointments();
      if (response.success && response.data) {
        const appointmentsData = Array.isArray(response.data) ? response.data : [];
        const repairAppointments = appointmentsData.filter(appointment => 
          appointment.status === 'confirmed' || 
          appointment.status === 'in-progress' || 
          appointment.status === 'payment-pending' ||
          appointment.status === 'completed'
        );
        
        // Kategori bazlı filtreleme ekle
        const categoryFilteredAppointments = repairAppointments.filter(appointment => {
          const serviceType = appointment.serviceType;
          // Eğer serviceType categoryInfo.serviceTypes içindeyse göster
          return categoryInfo.serviceTypes.some(catType => 
            serviceType === catType || serviceType?.includes(catType) || catType.includes(serviceType)
          );
        });
        
        const formattedJobs = categoryFilteredAppointments.map(appointment => {
          // Fiyat önceliği: finalPrice > price > quotedPrice
          const appointmentPrice = appointment.finalPrice || appointment.price || appointment.quotedPrice || 0;
          
          console.log(`📊 Randevu fiyat bilgisi (${appointment._id.slice(-6)}):`, {
            finalPrice: appointment.finalPrice,
            price: appointment.price,
            quotedPrice: appointment.quotedPrice,
            kullanilan: appointmentPrice
          });
          
          return {
            _id: appointment._id,
            customerId: {
              name: appointment.userId?.name || 'Müşteri',
              surname: appointment.userId?.surname || '',
              phone: appointment.userId?.phone || ''
            },
            vehicleId: {
              brand: appointment.vehicleId?.brand || '',
              modelName: appointment.vehicleId?.modelName || '',
              plateNumber: appointment.vehicleId?.plateNumber || ''
            },
            serviceType: appointment.serviceType,
            description: appointment.description || appointment.notes || '',
            photos: [],
            priority: 'medium' as 'medium',
            status: (appointment.status === 'confirmed' ? 'pending' : 
                    appointment.status === 'in-progress' ? 'accepted' :
                    appointment.status === 'payment-pending' ? 'in_progress' :
                    appointment.status === 'completed' ? 'completed' : 'pending') as 'pending' | 'accepted' | 'in_progress' | 'completed',
            estimatedDuration: appointment.estimatedDuration || '2 saat',
            price: appointmentPrice,
            location: appointment.location || { address: '', city: '', coordinates: [0, 0] as [number, number] },
            scheduledDate: appointment.appointmentDate || new Date().toISOString(),
            createdAt: appointment.createdAt || appointment.appointmentDate,
            updatedAt: appointment.updatedAt || new Date().toISOString()
          };
        });
        
        setRepairJobs(formattedJobs);
      } else {
        setRepairJobs([]);
      }
    } catch (error) {
      console.error('Tamir işleri yüklenirken hata:', error);
      setRepairJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchRepairJobs();
    }, [isAuthenticated, user, categoryInfo.serviceTypes])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRepairJobs(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#DC2626';
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Acil';
      case 'high': return 'Yüksek';
      case 'medium': return 'Orta';
      case 'low': return 'Düşük';
      default: return 'Bilinmiyor';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#6B7280';
      case 'accepted': return '#3B82F6';
      case 'in_progress': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'accepted': return 'İşlem Yapılıyor';
      case 'in_progress': return 'Ödeme Bekleniyor';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return 'Bilinmiyor';
    }
  };

  const filteredJobs = repairJobs.filter(job => {
    if (filter === 'all') return true;
    return job.status === filter;
  });

  const openPriceModal = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setRepairPrice('');
    setShowPriceModal(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const closePriceModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowPriceModal(false);
      setSelectedAppointmentId(null);
      setRepairPrice('');
    });
  };

  const handleSubmitPrice = async () => {
    if (!selectedAppointmentId || !repairPrice || isNaN(Number(repairPrice))) {
      Alert.alert('Hata', 'Lütfen geçerli bir ücret girin');
      return;
    }

    const price = Number(repairPrice);
    if (price <= 0) {
      Alert.alert('Hata', 'Ücret 0\'dan büyük olmalıdır');
      return;
    }

    try {
      await handleAppointmentStatusUpdate(selectedAppointmentId, 'payment-pending', price);
      closePriceModal();
      Alert.alert(
        'Başarılı! 🎉',
        `Tamir ücreti (${price}₺) müşteriye gönderildi.\nÖdeme yapıldıktan sonra kazanç cüzdanınıza eklenecektir.`,
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.log('❌ Ücret gönderme hatası:', error);
    }
  };

  const handleAppointmentStatusUpdate = async (appointmentId: string, status: string, price?: number) => {
    try {
      console.log(`🔄 Randevu durumu güncelleniyor: ${appointmentId} -> ${status}`, price ? `Fiyat: ${price}₺` : '');
      
      let response;
      if (status === 'in-progress') {
        response = await apiService.updateAppointmentStatus(appointmentId, 'in-progress' as any);
      } else if (status === 'payment-pending') {
        // Fiyat ile birlikte status'u güncelle
        response = await apiService.updateAppointmentStatus(appointmentId, 'payment-pending' as any, price);
        if (response.success) {
          console.log(`✅ Randevu durumu ve fiyat güncellendi: ${price}₺`);
        }
      } else if (status === 'completed') {
        response = await apiService.updateAppointmentStatus(appointmentId, 'completed' as any);
      }

      if (response?.success) {
        console.log('✅ Randevu durumu başarıyla güncellendi');
        // 500ms bekle ve refresh et (backend'in kaydetmesi için)
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        await fetchRepairJobs(true); // showLoading=true ile yenile
      } else {
        console.log('❌ Randevu durumu güncellenemedi:', response?.message);
        Alert.alert('Hata', response?.message || 'Randevu durumu güncellenemedi');
      }
    } catch (error: any) {
      console.log('❌ Randevu durumu güncelleme hatası:', error);
      Alert.alert('Hata', 'Randevu durumu güncellenirken bir hata oluştu');
    }
  };

  const renderRepairJob = (job: RepairJob) => {
    const renderStatusProgress = () => {
      const steps = [
        { key: 'pending', label: 'Onaylandı', icon: 'checkmark-circle' },
        { key: 'accepted', label: 'İşlem Yapılıyor', icon: categoryInfo.icon as any },
        { key: 'in_progress', label: 'Ödeme Bekleniyor', icon: 'card' },
        { key: 'completed', label: 'Tamamlandı', icon: 'trophy' },
      ];

      const currentStepIndex = steps.findIndex(step => step.key === job.status);

      return (
        <View style={styles.progressContainer}>
          {steps.map((step, index) => {
            const isActive = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <React.Fragment key={step.key}>
                <View style={styles.progressStep}>
                  <View 
                    style={[
                      styles.progressDot,
                      isActive && styles.progressDotActive,
                      isCurrent && styles.progressDotCurrent,
                    ]}
                  >
                    <Ionicons 
                      name={step.icon as any} 
                      size={isCurrent ? 18 : 14} 
                      color={isActive ? '#FFFFFF' : '#94A3B8'} 
                    />
                  </View>
                  <Text 
                    style={[
                      styles.progressLabel,
                      isActive && styles.progressLabelActive,
                      isCurrent && styles.progressLabelCurrent,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
                {index < steps.length - 1 && (
                  <View style={[styles.progressLine, isActive && styles.progressLineActive]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      );
    };

    const renderActionSection = () => {
      switch (job.status) {
        case 'pending':
          return (
            <TouchableOpacity
              style={[styles.modernActionButton, { backgroundColor: categoryInfo.color }]}
              onPress={() => handleAppointmentStatusUpdate(job._id, 'in-progress')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={categoryInfo.gradientColors}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="play-circle" size={22} color="#FFFFFF" />
                <Text style={styles.modernActionButtonText}>İşe Başla</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          );
        
        case 'accepted':
          return (
            <View style={styles.actionGroup}>
              <View style={styles.infoCard}>
                <Ionicons name="time" size={20} color="#F59E0B" />
                <Text style={styles.infoCardText}>İşlem devam ediyor...</Text>
              </View>
              <TouchableOpacity
                style={[styles.modernActionButton, { backgroundColor: '#10B981' }]}
                onPress={() => openPriceModal(job._id)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="cash" size={22} color="#FFFFFF" />
                  <Text style={styles.modernActionButtonText}>İşi Tamamla & Ücret Belirle</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          );
        
        case 'in_progress':
          return (
            <View style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <Ionicons name="time-outline" size={24} color="#F59E0B" />
                <Text style={styles.paymentTitle}>Ödeme Bekleniyor</Text>
              </View>
              <View style={styles.paymentBody}>
                <Text style={styles.paymentLabel}>Belirlenen Ücret</Text>
                <Text style={styles.paymentAmount}>{job.price}₺</Text>
              </View>
              <View style={styles.paymentFooter}>
                <Ionicons name="information-circle" size={16} color="#64748B" />
                <Text style={styles.paymentInfo}>
                  Müşteri ödeme yaptığında kazancınız cüzdanınıza eklenecektir
                </Text>
              </View>
            </View>
          );
        
        case 'completed':
          return (
            <View style={styles.completedCard}>
              <View style={styles.completedHeader}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                <View style={styles.completedTextContainer}>
                  <Text style={styles.completedTitle}>İşlem Tamamlandı!</Text>
                  <Text style={styles.completedSubtitle}>Kazanç: {job.price}₺</Text>
                </View>
              </View>
              <View style={styles.completedBadge}>
                <Ionicons name="wallet" size={16} color="#10B981" />
                <Text style={styles.completedBadgeText}>Cüzdana Eklendi</Text>
              </View>
            </View>
          );
        
        default:
          return null;
      }
    };

    return (
      <View key={job._id} style={styles.jobCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(job.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                {getStatusText(job.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.jobId}>#{job._id.slice(-6).toUpperCase()}</Text>
        </View>

        {/* Progress */}
        {renderStatusProgress()}

        {/* Customer Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="person" size={18} color="#3B82F6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Müşteri</Text>
              <Text style={styles.infoValue}>
                {job.customerId.name} {job.customerId.surname}
              </Text>
              <TouchableOpacity 
                style={styles.phoneButton}
                onPress={() => Alert.alert('Ara', job.customerId.phone)}
              >
                <Ionicons name="call" size={14} color="#3B82F6" />
                <Text style={styles.phoneText}>{job.customerId.phone}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="car" size={18} color="#10B981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Araç</Text>
              <Text style={styles.infoValue}>
                {job.vehicleId.brand} {job.vehicleId.modelName}
              </Text>
              <View style={styles.plateContainer}>
                <Text style={styles.plateText}>{job.vehicleId.plateNumber}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.iconBadge}>
              <Ionicons name={categoryInfo.icon as any} size={18} color={categoryInfo.color} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Hizmet Türü</Text>
              <Text style={styles.infoValue}>
                {serviceNameMapping[job.serviceType] || job.serviceType}
              </Text>
              {job.description && (
                <Text style={styles.descriptionText} numberOfLines={2}>
                  {job.description}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          {renderActionSection()}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name={categoryInfo.icon as any} size={64} color={categoryInfo.color} />
          <Text style={styles.loadingText}>{categoryInfo.title} işleri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{categoryInfo.title}</Text>
          <Text style={styles.headerSubtitle}>{filteredJobs.length} aktif iş</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={categoryInfo.color} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'Tümü', icon: 'list' },
            { key: 'pending', label: 'Onaylandı', icon: 'checkmark-circle' },
            { key: 'accepted', label: 'İşlem Yapılıyor', icon: categoryInfo.icon },
            { key: 'in_progress', label: 'Ödeme Bekleniyor', icon: 'card' },
            { key: 'completed', label: 'Tamamlandı', icon: 'trophy' },
          ].map((filterItem) => (
            <TouchableOpacity
              key={filterItem.key}
              style={[
                styles.filterChip,
                filter === filterItem.key && styles.filterChipActive
              ]}
              onPress={() => setFilter(filterItem.key as any)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={filterItem.icon as any} 
                size={16} 
                color={filter === filterItem.key ? '#FFFFFF' : '#64748B'} 
              />
              <Text style={[
                styles.filterChipText,
                filter === filterItem.key && styles.filterChipTextActive
              ]}>
                {filterItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={categoryInfo.color} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name={`${categoryInfo.icon}-outline` as any} size={80} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>Henüz {categoryInfo.title} İşi Yok</Text>
            <Text style={styles.emptyDescription}>
              {filter === 'all' 
                ? 'Onaylanan randevular burada görünecektir'
                : 'Bu kategoride iş bulunmuyor'
              }
            </Text>
          </View>
        ) : (
          filteredJobs.map(renderRepairJob)
        )}
      </ScrollView>

      {/* Price Modal */}
      <Modal
        visible={showPriceModal}
        transparent
        animationType="fade"
        onRequestClose={closePriceModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="cash-outline" size={32} color={categoryInfo.color} />
              </View>
              <Text style={styles.modalTitle}>{categoryInfo.title} Ücreti Belirle</Text>
              <Text style={styles.modalSubtitle}>
                İşlem tamamlandı! Müşteriye gönderilecek ücreti belirleyin.
              </Text>
            </View>
            
            <View style={styles.priceInputContainer}>
              <Text style={styles.priceLabel}>Ücret</Text>
              <View style={styles.priceInputWrapper}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  value={repairPrice}
                  onChangeText={setRepairPrice}
                  keyboardType="numeric"
                  autoFocus
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.currencySymbol}>₺</Text>
              </View>
              <Text style={styles.priceHint}>
                Müşteri ödeme yaptıktan sonra kazanç cüzdanınıza eklenecektir
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closePriceModal}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.submitButton,
                  (!repairPrice || isNaN(Number(repairPrice))) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmitPrice}
                disabled={!repairPrice || isNaN(Number(repairPrice))}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Ücret Gönder</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  filterContainer: {
    paddingVertical: 16,
    paddingLeft: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginRight: 10,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 20,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  jobId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressDotActive: {
    backgroundColor: '#3B82F6',
  },
  progressDotCurrent: {
    backgroundColor: '#3B82F6',
    transform: [{ scale: 1.1 }],
  },
  progressLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
  progressLabelActive: {
    color: '#475569',
  },
  progressLabelCurrent: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  progressLine: {
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
    marginBottom: 32,
    width: 20,
  },
  progressLineActive: {
    backgroundColor: '#3B82F6',
  },
  infoSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 4,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  plateContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  plateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  actionSection: {
    marginTop: 4,
  },
  actionGroup: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
  },
  infoCardText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
  },
  modernActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  modernActionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  paymentCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  paymentBody: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '500',
  },
  paymentAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F59E0B',
  },
  paymentFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentInfo: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  completedCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  completedTextContainer: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
  },
  completedSubtitle: {
    fontSize: 14,
    color: '#059669',
    marginTop: 2,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  priceInputContainer: {
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#64748B',
  },
  priceHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
