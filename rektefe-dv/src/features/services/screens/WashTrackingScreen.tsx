import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { apiService } from '@/shared/services/api';

type WashTrackingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WashTracking'>;
type WashTrackingScreenRouteProp = RouteProp<RootStackParamList, 'WashTracking'>;

interface WorkStep {
  step: string;
  name: string;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  photos: string[];
  notes?: string;
}

interface WashOrder {
  _id: string;
  orderNumber: string;
  type: 'shop' | 'mobile';
  status: string;
  vehicle: {
    brand: string;
    model: string;
    plateNumber: string;
    segment: string;
  };
  vehicleId?: {
    brand: string;
    modelName: string;
    year: number;
    plateNumber: string;
    segment: string;
  };
  package: {
    name: string;
    basePrice: number;
    duration: number;
  };
  packageId?: {
    name: string;
    basePrice: number;
    duration: number;
    extras: Array<{
      name: string;
      price: number;
      duration: number;
    }>;
  };
  providerId: {
    _id: string;
    name: string;
    surname: string;
    phone: string;
    businessName?: string;
  };
  location: {
    address: string;
  };
  scheduling: {
    slotStart?: string;
    slotEnd?: string;
    timeWindow?: {
      start: string;
      end: string;
    };
    estimatedDuration: number;
    actualStartTime?: string;
    actualEndTime?: string;
  };
  pricing: {
    finalPrice: number;
  };
  workSteps: WorkStep[];
  qa: {
    photosBefore: string[];
    photosAfter: string[];
    approvalStatus?: string;
    autoApproveAt?: string;
  };
  createdAt: string;
}

const WashTrackingScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<WashTrackingScreenNavigationProp>();
  const route = useRoute<WashTrackingScreenRouteProp>();
  
  const orderId = route.params?.orderId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [order, setOrder] = useState<WashOrder | null>(null);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedPhotoTitle, setSelectedPhotoTitle] = useState('');

  useEffect(() => {
    loadOrder();
    
    // Her 30 saniyede bir otomatik yenile
    const interval = setInterval(() => {
      loadOrder(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [orderId]);

  const loadOrder = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      
      const response = await apiService.getWashOrder(orderId);
      
      if (response.success && response.data) {
        setOrder(response.data);
      }
    } catch (error) {
      console.error('Sipariş yüklenemedi:', error);
      if (!silent) {
        Alert.alert('Hata', 'Sipariş bilgileri yüklenemedi');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrder(true);
    setRefreshing(false);
  };

  const handleCallProvider = () => {
    if (order?.providerId?.phone) {
      Linking.openURL(`tel:${order.providerId.phone}`);
    }
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Siparişi İptal Et',
      'Siparişinizi iptal etmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await apiService.cancelWashOrder(orderId, 'Kullanıcı tarafından iptal edildi');
              
              if (response.success) {
                Alert.alert('İptal Edildi', 'Siparişiniz iptal edildi', [
                  { text: 'Tamam', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Hata', response.message || 'İptal edilemedi');
              }
            } catch (error) {
              Alert.alert('Hata', 'İptal işlemi başarısız');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewPhotos = (photos: string[], title: string) => {
    setSelectedPhotos(photos);
    setSelectedPhotoTitle(title);
    setShowPhotosModal(true);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CREATED: 'Oluşturuldu',
      PRICED: 'Fiyatlandırıldı',
      DRIVER_CONFIRMED: 'Onaylandı',
      PROVIDER_ACCEPTED: 'İşletme Kabul Etti',
      EN_ROUTE: 'Yolda',
      CHECK_IN: 'Giriş Yapıldı',
      IN_PROGRESS: 'İşlemde',
      QA_PENDING: 'Kalite Kontrolü Bekliyor',
      COMPLETED: 'Tamamlandı',
      PAID: 'Ödeme Yapıldı',
      REVIEWED: 'Değerlendirildi',
      CANCELLED_BY_DRIVER: 'İptal Edildi',
      CANCELLED_BY_PROVIDER: 'İşletme İptal Etti',
      DISPUTED: 'İtirazlı',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CREATED: '#6B7280',
      PRICED: '#6B7280',
      DRIVER_CONFIRMED: '#3B82F6',
      PROVIDER_ACCEPTED: '#3B82F6',
      EN_ROUTE: '#F59E0B',
      CHECK_IN: '#F59E0B',
      IN_PROGRESS: '#8B5CF6',
      QA_PENDING: '#F59E0B',
      COMPLETED: '#10B981',
      PAID: '#10B981',
      REVIEWED: '#10B981',
      CANCELLED_BY_DRIVER: '#EF4444',
      CANCELLED_BY_PROVIDER: '#EF4444',
      DISPUTED: '#DC2626',
    };
    return colors[status] || '#6B7280';
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'check-circle';
      case 'in_progress': return 'loading';
      case 'pending': return 'circle-outline';
      case 'skipped': return 'close-circle';
      default: return 'circle-outline';
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'pending': return '#D1D5DB';
      case 'skipped': return '#9CA3AF';
      default: return '#D1D5DB';
    }
  };

  const renderTimeline = () => {
    if (!order) return null;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="clipboard-list" size={24} color={theme.colors.primary.main} />
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
            İşlem Adımları
          </Text>
        </View>

        <View style={styles.timeline}>
          {order.workSteps.map((step, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineIndicator}>
                <View style={[styles.timelineIcon, { backgroundColor: getStepColor(step.status) }]}>
                  <MaterialCommunityIcons
                    name={getStepIcon(step.status) as any}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                {index < order.workSteps.length - 1 && (
                  <View style={[
                    styles.timelineLine,
                    {
                      backgroundColor: step.status === 'completed' 
                        ? '#10B981' 
                        : '#E5E7EB',
                    }
                  ]} />
                )}
              </View>

              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: theme.colors.text.primary }]}>
                  {step.name}
                </Text>
                
                {step.status === 'in_progress' && (
                  <View style={[styles.statusBadge, { backgroundColor: '#F59E0B20' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#F59E0B' }]}>
                      Devam ediyor...
                    </Text>
                  </View>
                )}

                {step.completedAt && (
                  <Text style={[styles.timelineTime, { color: theme.colors.text.secondary }]}>
                    {new Date(step.completedAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}

                {step.notes && (
                  <Text style={[styles.timelineNotes, { color: theme.colors.text.secondary }]}>
                    {step.notes}
                  </Text>
                )}

                {step.photos && step.photos.length > 0 && (
                  <TouchableOpacity
                    style={styles.photosButton}
                    onPress={() => handleViewPhotos(step.photos, step.name)}
                  >
                    <MaterialCommunityIcons name="image-multiple" size={16} color={theme.colors.primary.main} />
                    <Text style={[styles.photosButtonText, { color: theme.colors.primary.main }]}>
                      {step.photos.length} Fotoğraf
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </Card>
    );
  };

  const renderQASection = () => {
    if (!order || order.status !== 'QA_PENDING') return null;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="check-decagram" size={24} color="#F59E0B" />
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
            Kalite Kontrolü
          </Text>
        </View>

        <View style={[styles.qaNotice, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B' }]}>
          <MaterialCommunityIcons name="alert-circle" size={20} color="#F59E0B" />
          <Text style={[styles.qaNoticeText, { color: '#F59E0B' }]}>
            İşlem tamamlandı! Lütfen önce ve sonra fotoğraflarını kontrol edin ve onaylayın.
          </Text>
        </View>

        {order.qa.autoApproveAt && (
          <Text style={[styles.autoApproveText, { color: theme.colors.text.secondary }]}>
            {new Date(order.qa.autoApproveAt).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })} tarihinde otomatik olarak onaylanacak
          </Text>
        )}

        <View style={styles.qaPhotosContainer}>
          <TouchableOpacity
            style={styles.qaPhotoSection}
            onPress={() => handleViewPhotos(order.qa.photosBefore, 'Öncesi Fotoğrafları')}
          >
            <MaterialCommunityIcons name="image-multiple" size={32} color={theme.colors.primary.main} />
            <Text style={[styles.qaPhotoLabel, { color: theme.colors.text.primary }]}>
              Öncesi
            </Text>
            <Text style={[styles.qaPhotoCount, { color: theme.colors.text.secondary }]}>
              {order.qa.photosBefore.length} foto
            </Text>
          </TouchableOpacity>

          <MaterialCommunityIcons name="arrow-right-bold" size={24} color={theme.colors.text.secondary} />

          <TouchableOpacity
            style={styles.qaPhotoSection}
            onPress={() => handleViewPhotos(order.qa.photosAfter, 'Sonrası Fotoğrafları')}
          >
            <MaterialCommunityIcons name="image-multiple" size={32} color={theme.colors.primary.main} />
            <Text style={[styles.qaPhotoLabel, { color: theme.colors.text.primary }]}>
              Sonrası
            </Text>
            <Text style={[styles.qaPhotoCount, { color: theme.colors.text.secondary }]}>
              {order.qa.photosAfter.length} foto
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.qaActions}>
          <Button
            title="Onayla"
            onPress={async () => {
              try {
                setLoading(true);
                const response = await apiService.approveWashQA(orderId, true);
                if (response.success) {
                  Alert.alert('Onaylandı', 'İşlem onaylandı ve ödeme yapıldı');
                  await loadOrder();
                }
              } catch (error) {
                Alert.alert('Hata', 'İşlem onaylanamadı');
              } finally {
                setLoading(false);
              }
            }}
            style={styles.qaApproveButton}
          />
          <Button
            title="Düzeltme İste"
            onPress={() => {
              Alert.prompt(
                'Düzeltme İste',
                'Lütfen düzeltilmesi gereken noktaları belirtin:',
                async (feedback) => {
                  if (feedback) {
                    try {
                      setLoading(true);
                      const response = await apiService.approveWashQA(orderId, false, feedback);
                      if (response.success) {
                        Alert.alert('Bildirildi', 'Düzeltme isteğiniz iletildi');
                        await loadOrder();
                      }
                    } catch (error) {
                      Alert.alert('Hata', 'İstek gönderilemedi');
                    } finally {
                      setLoading(false);
                    }
                  }
                }
              );
            }}
            style={styles.qaReworkButton}
            variant="outline"
          />
        </View>
      </Card>
    );
  };

  if (loading && !order) {
    return (
      <Background>
        <SafeAreaView style={styles.container}>
          <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
            <BackButton />
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Sipariş Takibi
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
              Yükleniyor...
            </Text>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  if (!order) {
    return (
      <Background>
        <SafeAreaView style={styles.container}>
          <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
            <BackButton />
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Sipariş Takibi
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={64} color="#EF4444" />
            <Text style={[styles.errorText, { color: theme.colors.text.primary }]}>
              Sipariş bulunamadı
            </Text>
            <Button
              title="Geri Dön"
              onPress={() => navigation.goBack()}
              style={styles.errorButton}
            />
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  return (
    <Background>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
          <BackButton />
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Sipariş Takibi
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              #{order.orderNumber}
            </Text>
          </View>
          <TouchableOpacity onPress={handleCallProvider} style={styles.callButton}>
            <MaterialCommunityIcons name="phone" size={24} color={theme.colors.primary.main} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary.main} />
          }
        >
          {/* Durum Kartı */}
          <Card style={styles.card}>
            <View style={[styles.statusCard, { backgroundColor: getStatusColor(order.status) + '10' }]}>
              <View style={[styles.statusIcon, { backgroundColor: getStatusColor(order.status) }]}>
                <MaterialCommunityIcons name="information" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.statusInfo}>
                <Text style={[styles.statusLabel, { color: theme.colors.text.secondary }]}>
                  Durum
                </Text>
                <Text style={[styles.statusValue, { color: getStatusColor(order.status) }]}>
                  {getStatusLabel(order.status)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Araç ve Paket Bilgileri */}
          <Card style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="car" size={20} color={theme.colors.primary.main} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                    Araç
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                    {(order.vehicle?.brand || order.vehicleId?.brand)} {(order.vehicle?.model || order.vehicleId?.modelName)}
                  </Text>
                  <Text style={[styles.infoSubvalue, { color: theme.colors.text.secondary }]}>
                    {order.vehicle?.plateNumber || order.vehicleId?.plateNumber}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoDivider, { backgroundColor: theme.colors.border.secondary }]} />

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="package-variant" size={20} color={theme.colors.primary.main} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                    Paket
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                    {order.package?.name || order.packageId?.name}
                  </Text>
                  <Text style={[styles.infoSubvalue, { color: theme.colors.text.secondary }]}>
                    {order.package?.duration || order.packageId?.duration} dakika • {order.pricing.finalPrice} TL
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoDivider, { backgroundColor: theme.colors.border.secondary }]} />

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="store" size={20} color={theme.colors.primary.main} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                    İşletme
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                    {order.providerId.name} {order.providerId.surname}
                  </Text>
                  <Text style={[styles.infoSubvalue, { color: theme.colors.text.secondary }]}>
                    {order.location.address}
                  </Text>
                </View>
              </View>
            </View>

            {(order.scheduling.slotStart || order.scheduling.timeWindow) && (
              <>
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border.secondary }]} />
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="calendar-clock" size={20} color={theme.colors.primary.main} />
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                        {order.type === 'shop' ? 'Randevu Saati' : 'Zaman Penceresi'}
                      </Text>
                      {order.scheduling.slotStart && (
                        <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                          {new Date(order.scheduling.slotStart).toLocaleString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      )}
                      {order.scheduling.timeWindow && (
                        <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                          {new Date(order.scheduling.timeWindow.start).toLocaleString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' - '}
                          {new Date(order.scheduling.timeWindow.end).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </>
            )}
          </Card>

          {/* Timeline */}
          {renderTimeline()}

          {/* QA Section */}
          {renderQASection()}

          {/* İptal Butonu */}
          {['DRIVER_CONFIRMED', 'PROVIDER_ACCEPTED', 'EN_ROUTE'].includes(order.status) && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: '#EF4444' }]}
              onPress={handleCancelOrder}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
              <Text style={[styles.cancelButtonText, { color: '#EF4444' }]}>
                Siparişi İptal Et
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  callButton: {
    padding: 10,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 28,
  },
  errorButton: {
    marginHorizontal: 0,
  },
  card: {
    marginTop: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: 0.3,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 20,
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  infoSubvalue: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoDivider: {
    height: 1,
    marginVertical: 16,
  },
  timeline: {
    marginTop: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 20,
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 3,
    flex: 1,
    minHeight: 36,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineTime: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '600',
  },
  timelineNotes: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  photosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  photosButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  qaNotice: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 12,
  },
  qaNoticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  autoApproveText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  qaPhotosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  qaPhotoSection: {
    alignItems: 'center',
    padding: 20,
  },
  qaPhotoLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    letterSpacing: 0.3,
  },
  qaPhotoCount: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  qaActions: {
    flexDirection: 'row',
    gap: 16,
  },
  qaApproveButton: {
    flex: 1,
  },
  qaReworkButton: {
    flex: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderRadius: 16,
    marginTop: 20,
    gap: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WashTrackingScreen;

