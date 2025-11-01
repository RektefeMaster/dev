import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

type TireServiceTrackingNavigationProp = StackNavigationProp<RootStackParamList, 'TireServiceTracking'>;
import { BackButton, Card, Button } from '@/shared/components';
import { apiService } from '@/shared/services/api';
import { serviceNameMapping } from '@/shared/utils/serviceTranslator';
import { typography, spacing, borderRadius } from '@/theme/theme';

type TireServiceTrackingRouteProp = RouteProp<RootStackParamList, 'TireServiceTracking'>;

interface TireJob {
  _id: string;
  serviceType: string;
  tireServiceType: string;
  status: string;
  vehicleInfo?: {
    brand: string;
    model: string;
    year: string;
    plateNumber?: string;
  };
  vehicleId?: {
    brand: string;
    model: string;
    year: string;
    plateNumber: string;
  };
  tireSize?: string;
  tireBrand?: string;
  tireModel?: string;
  quantity?: number;
  season?: string;
  description?: string;
  specialRequests?: string;
  price?: number;
  quotedPrice?: number;
  finalPrice?: number;
  isMobileService?: boolean;
  isUrgent?: boolean;
  location?: {
    address?: string;
    coordinates?: number[];
  };
  mechanicId?: {
    _id: string;
    name: string;
    surname: string;
    phone: string;
    shopName?: string;
    rating?: number;
  };
  appointmentDate: string;
  timeSlot: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    notes?: string;
  }>;
  mechanicNotes?: string;
  warrantyInfo?: {
    duration: number;
    conditions: string[];
  };
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

const TireServiceTrackingScreen = () => {
  const route = useRoute<TireServiceTrackingRouteProp>();
  const navigation = useNavigation<TireServiceTrackingNavigationProp>();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [job, setJob] = useState<TireJob | null>(null);

  const jobId = route.params?.jobId;

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTireServiceById(jobId);
      
      if (response.success && response.data) {
        setJob(response.data);
      } else {
        Alert.alert('Hata', 'İş detayları yüklenemedi');
        navigation.goBack();
      }
    } catch (error) {
      console.error('İş detayları yükleme hatası:', error);
      Alert.alert('Hata', 'İş detayları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobDetails();
    setRefreshing(false);
  };

  const getServiceTypeText = (type: string) => {
    return serviceNameMapping[type] || type;
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'TALEP_EDILDI': 'Talep Edildi',
      'PLANLANDI': 'Planlandı',
      'SERVISTE': 'Serviste',
      'ODEME_BEKLIYOR': 'Ödeme Bekliyor',
      'TAMAMLANDI': 'Tamamlandı',
      'IPTAL_EDILDI': 'İptal Edildi',
      'NO_SHOW': 'Gelmedi',
      // Eski değerler (geriye dönük uyumluluk)
      'ONAYLANDI': 'Planlandı',
      'DEVAM_EDIYOR': 'Serviste',
      'pending': 'Bekliyor',
      'accepted': 'Kabul Edildi',
      'in_progress': 'Devam Ediyor',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'TALEP_EDILDI': '#FF9800',
      'PLANLANDI': '#2196F3',
      'SERVISTE': '#4CAF50',
      'ODEME_BEKLIYOR': '#FFC107',
      'TAMAMLANDI': '#4CAF50',
      'IPTAL_EDILDI': '#F44336',
      'NO_SHOW': '#757575',
      // Eski değerler (geriye dönük uyumluluk)
      'ONAYLANDI': '#2196F3',
      'DEVAM_EDIYOR': '#4CAF50',
      'pending': '#FF9800',
      'accepted': '#2196F3',
      'in_progress': '#4CAF50',
      'completed': '#4CAF50',
      'cancelled': '#F44336'
    };
    return colorMap[status] || '#666';
  };

  const getStatusIcon = (status: string) => {
    const iconMap: Record<string, any> = {
      'TALEP_EDILDI': 'time-outline',
      'PLANLANDI': 'checkmark-circle-outline',
      'SERVISTE': 'construct-outline',
      'ODEME_BEKLIYOR': 'card-outline',
      'TAMAMLANDI': 'checkmark-done-circle',
      'IPTAL_EDILDI': 'close-circle-outline',
      'NO_SHOW': 'alert-circle-outline',
      // Eski değerler (geriye dönük uyumluluk)
      'ONAYLANDI': 'checkmark-circle-outline',
      'DEVAM_EDIYOR': 'construct-outline',
      'pending': 'time-outline',
      'accepted': 'checkmark-circle-outline',
      'in_progress': 'construct-outline',
      'completed': 'checkmark-done-circle',
      'cancelled': 'close-circle-outline'
    };
    return iconMap[status] || 'help-circle-outline';
  };

  const callMechanic = () => {
    if (job?.mechanicId?.phone) {
      Linking.openURL(`tel:${job.mechanicId.phone}`);
    }
  };

  const openLocation = () => {
    if (job?.location?.coordinates) {
      const [lng, lat] = job.location.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url);
    }
  };

  const handleRating = () => {
    if (job?.mechanicId?._id) {
      navigation.navigate('Rating', {
        appointmentId: job._id,
        mechanicId: job.mechanicId._id,
        mechanicName: `${job.mechanicId.name} ${job.mechanicId.surname}`
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            İş detayları yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.text.tertiary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
            İş bulunamadı
          </Text>
          <Button
            title="Geri Dön"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const vehicle = job.vehicleId || job.vehicleInfo;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary, borderBottomColor: theme.colors.border.primary }]}>
          <BackButton />
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Lastik İşi Takibi
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              {getServiceTypeText(job.tireServiceType)}
            </Text>
          </View>
        </View>

        {/* Status Card */}
        <Card style={styles.section}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor(job.status) + '20' }]}>
              <Ionicons name={getStatusIcon(job.status)} size={48} color={getStatusColor(job.status)} />
            </View>
            <Text style={[styles.statusTitle, { color: theme.colors.text.primary }]}>
              {getStatusText(job.status)}
            </Text>
            {job.isUrgent && (
              <View style={[styles.urgentBadge, { backgroundColor: theme.colors.error.main }]}>
                <Ionicons name="alert" size={16} color="#FFFFFF" />
                <Text style={styles.urgentText}>Acil</Text>
              </View>
            )}
            {job.isMobileService && (
              <View style={[styles.mobileBadge, { backgroundColor: theme.colors.info.main }]}>
                <Ionicons name="car" size={16} color="#FFFFFF" />
                <Text style={styles.mobileText}>Mobil Hizmet</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Vehicle Info */}
        {vehicle && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Araç Bilgileri
            </Text>
            <View style={[styles.vehicleCard, { backgroundColor: theme.colors.background.secondary }]}>
              <View style={styles.vehicleRow}>
                <Ionicons name="car" size={20} color={theme.colors.primary.main} />
                <Text style={[styles.vehicleText, { color: theme.colors.text.primary }]}>
                  {vehicle.brand} {vehicle.model}
                </Text>
              </View>
              <View style={styles.vehicleRow}>
                <Ionicons name="calendar" size={20} color={theme.colors.text.secondary} />
                <Text style={[styles.vehicleText, { color: theme.colors.text.secondary }]}>
                  {vehicle.year}
                </Text>
              </View>
              {vehicle.plateNumber && (
                <View style={styles.vehicleRow}>
                  <Ionicons name="card" size={20} color={theme.colors.text.secondary} />
                  <Text style={[styles.vehicleText, { color: theme.colors.text.secondary }]}>
                    {vehicle.plateNumber}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Tire Details */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Lastik Detayları
          </Text>
          <View style={[styles.tireDetailsCard, { backgroundColor: theme.colors.background.secondary }]}>
            {job.tireSize && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>Lastik Ölçüsü:</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>{job.tireSize}</Text>
              </View>
            )}
            {job.tireBrand && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>Marka:</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                  {job.tireBrand} {job.tireModel || ''}
                </Text>
              </View>
            )}
            {job.quantity && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>Miktar:</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>{job.quantity} Adet</Text>
              </View>
            )}
            {job.season && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>Mevsim:</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                  {job.season === 'summer' ? 'Yaz' : job.season === 'winter' ? 'Kış' : 'Dört Mevsim'}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Mechanic Info */}
        {job.mechanicId && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Usta Bilgileri
            </Text>
            <View style={[styles.mechanicCard, { backgroundColor: theme.colors.background.secondary }]}>
              <View style={styles.mechanicHeader}>
                <View style={[styles.mechanicAvatar, { backgroundColor: theme.colors.primary.main }]}>
                  <Text style={styles.mechanicAvatarText}>
                    {job.mechanicId.name.charAt(0)}{job.mechanicId.surname.charAt(0)}
                  </Text>
                </View>
                <View style={styles.mechanicInfo}>
                  <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
                    {job.mechanicId.name} {job.mechanicId.surname}
                  </Text>
                  {job.mechanicId.shopName && (
                    <Text style={[styles.mechanicShop, { color: theme.colors.text.secondary }]}>
                      {job.mechanicId.shopName}
                    </Text>
                  )}
                  {job.mechanicId.rating && (
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={16} color="#FFB800" />
                      <Text style={[styles.ratingText, { color: theme.colors.text.secondary }]}>
                        {job.mechanicId.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.callButton, { backgroundColor: theme.colors.success.main }]}
                onPress={callMechanic}
              >
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <Text style={styles.callButtonText}>Usta ile İletişim</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Price Info */}
        {(job.quotedPrice || job.price || job.finalPrice) && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Ücret Bilgisi
            </Text>
            <View style={[styles.priceCard, { backgroundColor: theme.colors.primary.main + '10', borderColor: theme.colors.primary.main }]}>
              <View style={styles.priceRow}>
                <Ionicons name="cash-outline" size={32} color={theme.colors.primary.main} />
                <View style={styles.priceInfo}>
                  <Text style={[styles.priceLabel, { color: theme.colors.text.secondary }]}>
                    {job.status === 'TAMAMLANDI' ? 'Toplam Tutar' : 'Teklif Edilen Tutar'}
                  </Text>
                  <Text style={[styles.priceValue, { color: theme.colors.primary.main }]}>
                    {(job.finalPrice || job.quotedPrice || job.price)?.toFixed(2)} TL
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Notes */}
        {(job.description || job.specialRequests || job.mechanicNotes) && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Notlar
            </Text>
            {job.description && (
              <View style={[styles.noteCard, { backgroundColor: theme.colors.background.secondary }]}>
                <Text style={[styles.noteLabel, { color: theme.colors.text.secondary }]}>Açıklama:</Text>
                <Text style={[styles.noteText, { color: theme.colors.text.primary }]}>{job.description}</Text>
              </View>
            )}
            {job.specialRequests && (
              <View style={[styles.noteCard, { backgroundColor: theme.colors.background.secondary }]}>
                <Text style={[styles.noteLabel, { color: theme.colors.text.secondary }]}>Özel İstekler:</Text>
                <Text style={[styles.noteText, { color: theme.colors.text.primary }]}>{job.specialRequests}</Text>
              </View>
            )}
            {job.mechanicNotes && (
              <View style={[styles.noteCard, { backgroundColor: theme.colors.info.main + '10' }]}>
                <Text style={[styles.noteLabel, { color: theme.colors.text.secondary }]}>Usta Notu:</Text>
                <Text style={[styles.noteText, { color: theme.colors.text.primary }]}>{job.mechanicNotes}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Warranty Info */}
        {job.warrantyInfo && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Garanti Bilgisi
            </Text>
            <View style={[styles.warrantyCard, { backgroundColor: theme.colors.success.main + '10' }]}>
              <View style={styles.warrantyHeader}>
                <Ionicons name="shield-checkmark" size={32} color={theme.colors.success.main} />
                <Text style={[styles.warrantyDuration, { color: theme.colors.success.main }]}>
                  {job.warrantyInfo.duration} Ay Garanti
                </Text>
              </View>
              <View style={styles.warrantyConditions}>
                {job.warrantyInfo.conditions.map((condition, index) => (
                  <View key={index} style={styles.warrantyConditionRow}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success.main} />
                    <Text style={[styles.warrantyCondition, { color: theme.colors.text.primary }]}>
                      {condition}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        )}

        {/* Timeline */}
        {job.statusHistory && job.statusHistory.length > 0 && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              İşlem Geçmişi
            </Text>
            {job.statusHistory.map((history, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(history.status) }]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineStatus, { color: theme.colors.text.primary }]}>
                    {getStatusText(history.status)}
                  </Text>
                  <Text style={[styles.timelineDate, { color: theme.colors.text.secondary }]}>
                    {new Date(history.timestamp).toLocaleString('tr-TR')}
                  </Text>
                  {history.notes && (
                    <Text style={[styles.timelineNotes, { color: theme.colors.text.secondary }]}>
                      {history.notes}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Action Buttons */}
        {job.status === 'TAMAMLANDI' && !job.rating && (
          <Card style={styles.section}>
            <Button
              title="İşi Değerlendir"
              onPress={handleRating}
              variant="primary"
              style={styles.actionButton}
            />
          </Card>
        )}

        {job.location?.coordinates && (
          <Card style={styles.section}>
            <Button
              title="Konumu Haritada Aç"
              onPress={openLocation}
              variant="secondary"
              style={styles.actionButton}
            />
          </Card>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.body1.fontSize,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  backButton: {
    minWidth: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
  headerSubtitle: {
    fontSize: typography.body2.fontSize,
    marginTop: spacing.xs,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statusIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    marginBottom: spacing.sm,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  urgentText: {
    color: '#FFFFFF',
    fontSize: typography.caption.small.fontSize,
    fontWeight: typography.caption.small.fontWeight,
    marginLeft: spacing.xs,
  },
  mobileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  mobileText: {
    color: '#FFFFFF',
    fontSize: typography.caption.small.fontSize,
    fontWeight: typography.caption.small.fontWeight,
    marginLeft: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    marginBottom: spacing.md,
  },
  vehicleCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vehicleText: {
    fontSize: typography.body1.fontSize,
    marginLeft: spacing.sm,
  },
  tireDetailsCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.body2.fontSize,
  },
  detailValue: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
  },
  mechanicCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  mechanicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mechanicAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mechanicAvatarText: {
    color: '#FFFFFF',
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
  },
  mechanicInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  mechanicName: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
  },
  mechanicShop: {
    fontSize: typography.body2.fontSize,
    marginTop: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ratingText: {
    fontSize: typography.body2.fontSize,
    marginLeft: spacing.xs,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
    marginLeft: spacing.sm,
  },
  priceCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  priceLabel: {
    fontSize: typography.body2.fontSize,
  },
  priceValue: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    marginTop: spacing.xs,
  },
  noteCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  noteLabel: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: typography.caption.small.fontWeight,
    marginBottom: spacing.xs,
  },
  noteText: {
    fontSize: typography.body2.fontSize,
    lineHeight: 20,
  },
  warrantyCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  warrantyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  warrantyDuration: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    marginLeft: spacing.sm,
  },
  warrantyConditions: {
    marginTop: spacing.sm,
  },
  warrantyConditionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  warrantyCondition: {
    flex: 1,
    fontSize: typography.body2.fontSize,
    marginLeft: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: spacing.xs,
    marginRight: spacing.md,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
  },
  timelineDate: {
    fontSize: typography.caption.small.fontSize,
    marginTop: spacing.xs,
  },
  timelineNotes: {
    fontSize: typography.body2.fontSize,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  actionButton: {
    marginTop: spacing.sm,
  },
});

export default TireServiceTrackingScreen;

