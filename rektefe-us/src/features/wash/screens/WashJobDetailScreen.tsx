import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, typography } from '@/shared/theme';
import apiService from '@/shared/services';

interface WashJob {
  _id: string;
  orderNumber: string;
  type: 'shop' | 'mobile';
  status: string;
  driverId: {
    _id: string;
    name: string;
    surname: string;
    phone: string;
  };
  vehicle: {
    brand: string;
    model: string;
    plateNumber: string;
    segment: string;
  };
  package: {
    name: string;
    basePrice: number;
    duration: number;
  };
  location: {
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
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
  workSteps: Array<{
    step: string;
    name: string;
    order: number;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    photos: string[];
    notes?: string;
  }>;
  qa: {
    photosBeforeRequired: string[];
    photosAfterRequired: string[];
    photosBefore: string[];
    photosAfter: string[];
  };
  createdAt: string;
}

export default function WashJobDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: { jobId: string } }, 'params'>>();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);

  const jobId = route.params?.jobId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [job, setJob] = useState<WashJob | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // QA Photo upload
  const [showQAModal, setShowQAModal] = useState(false);
  const [photosBefore, setPhotosBefore] = useState<string[]>([]);
  const [photosAfter, setPhotosAfter] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (jobId) {
        loadJob();
      }
    }, [jobId])
  );

  const loadJob = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      
      const response = await apiService.CarWashService.getWashJobs();
      
      if (response.success && response.data) {
        const foundJob = response.data.find((j: WashJob) => j._id === jobId);
        if (foundJob) {
          setJob(foundJob);
        }
      }
    } catch (error) {
      console.error('İş yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJob(true);
    setRefreshing(false);
  };

  const handleAcceptJob = async () => {
    try {
      setActionLoading(true);
      const response = await apiService.CarWashService.acceptWashJob(jobId);
      
      if (response.success) {
        Alert.alert('Başarılı', 'İş kabul edildi');
        await loadJob();
      } else {
        Alert.alert('Hata', response.message || 'İş kabul edilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'İş kabul edilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const response = await apiService.CarWashService.checkInWashJob(jobId);
      
      if (response.success) {
        Alert.alert('Başarılı', 'Check-in yapıldı');
        await loadJob();
      } else {
        Alert.alert('Hata', response.message || 'Check-in yapılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Check-in yapılamadı');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartWork = async () => {
    try {
      setActionLoading(true);
      const response = await apiService.CarWashService.startWashJob(jobId);
      
      if (response.success) {
        Alert.alert('Başarılı', 'İşlem başlatıldı');
        await loadJob();
      } else {
        Alert.alert('Hata', response.message || 'İşlem başlatılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'İşlem başlatılamadı');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteStep = async (stepIndex: number, notes?: string) => {
    try {
      setActionLoading(true);
      const response = await apiService.CarWashService.updateWashProgress(jobId, {
        stepIndex,
        completed: true,
        notes,
      });
      
      if (response.success) {
        await loadJob();
      } else {
        Alert.alert('Hata', response.message || 'Adım tamamlanamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Adım tamamlanamadı');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTakePhoto = async (type: 'before' | 'after', angleIndex: number) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin vermeniz gerekiyor');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingPhoto(true);
        
        // TODO: Fotoğrafı storage'a yükle ve URL al
        const photoUrl = result.assets[0].uri; // Geçici olarak local URI
        
        if (type === 'before') {
          const newPhotos = [...photosBefore];
          newPhotos[angleIndex] = photoUrl;
          setPhotosBefore(newPhotos);
        } else {
          const newPhotos = [...photosAfter];
          newPhotos[angleIndex] = photoUrl;
          setPhotosAfter(newPhotos);
        }
        
        setUploadingPhoto(false);
      }
    } catch (error) {
      console.error('Fotoğraf çekme hatası:', error);
      setUploadingPhoto(false);
    }
  };

  const handleSubmitQA = async () => {
    if (!job) return;

    // Gerekli fotoğrafları kontrol et
    const requiredBeforeCount = job.qa.photosBeforeRequired.length;
    const requiredAfterCount = job.qa.photosAfterRequired.length;

    if (photosBefore.filter(p => p).length < requiredBeforeCount) {
      Alert.alert('Eksik Fotoğraf', `Lütfen ${requiredBeforeCount} adet "öncesi" fotoğrafı çekin`);
      return;
    }

    if (photosAfter.filter(p => p).length < requiredAfterCount) {
      Alert.alert('Eksik Fotoğraf', `Lütfen ${requiredAfterCount} adet "sonrası" fotoğrafı çekin`);
      return;
    }

    try {
      setActionLoading(true);
      const response = await apiService.CarWashService.submitWashQA(jobId, {
        photosBefore: photosBefore.filter(p => p),
        photosAfter: photosAfter.filter(p => p),
      });
      
      if (response.success) {
        Alert.alert('Başarılı', 'Kalite kontrol gönderildi, müşteri onayı bekleniyor');
        setShowQAModal(false);
        await loadJob();
      } else {
        Alert.alert('Hata', response.message || 'QA gönderilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'QA gönderilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallCustomer = () => {
    if (job?.driverId?.phone) {
      Linking.openURL(`tel:${job.driverId.phone}`);
    }
  };

  const handleNavigate = () => {
    if (job?.location?.coordinates) {
      const { latitude, longitude } = job.location.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      Linking.openURL(url);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRIVER_CONFIRMED: 'Yeni Talep',
      PROVIDER_ACCEPTED: 'Kabul Edildi',
      EN_ROUTE: 'Yolda',
      CHECK_IN: 'Giriş Yapıldı',
      IN_PROGRESS: 'İşlemde',
      QA_PENDING: 'Kalite Kontrolü',
      COMPLETED: 'Tamamlandı',
      PAID: 'Ödeme Alındı',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      DRIVER_CONFIRMED: '#3B82F6',
      PROVIDER_ACCEPTED: '#10B981',
      EN_ROUTE: '#F59E0B',
      CHECK_IN: '#8B5CF6',
      IN_PROGRESS: '#8B5CF6',
      QA_PENDING: '#F59E0B',
      COMPLETED: '#10B981',
      PAID: '#10B981',
    };
    return colorMap[status] || '#6B7280';
  };

  const getPhotoAngleLabel = (angle: string) => {
    const labels: Record<string, string> = {
      front: 'Ön',
      back: 'Arka',
      left: 'Sol',
      right: 'Sağ',
      interior_front: 'İç Ön',
      interior_back: 'İç Arka',
      hood: 'Kaput',
      roof: 'Tavan',
    };
    return labels[angle] || angle;
  };

  if (loading && !job) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={[styles.errorText, { color: colors.text }]}>
            İş bulunamadı
          </Text>
          <Button
            title="Geri Dön"
            onPress={() => navigation.goBack()}
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            İş Detayı
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            #{job.orderNumber}
          </Text>
        </View>
        <TouchableOpacity onPress={handleCallCustomer} style={styles.callButton}>
          <Ionicons name="call" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Durum Kartı */}
        <Card style={styles.card}>
          <View style={[styles.statusCard, { backgroundColor: getStatusColor(job.status) + '10' }]}>
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor(job.status) }]}>
              <Ionicons name="information" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                Durum
              </Text>
              <Text style={[styles.statusValue, { color: getStatusColor(job.status) }]}>
                {getStatusLabel(job.status)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Müşteri Bilgileri */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Müşteri Bilgileri
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Ad Soyad:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {job.driverId.name} {job.driverId.surname}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Telefon:</Text>
            <TouchableOpacity onPress={handleCallCustomer}>
              <Text style={[styles.infoValue, { color: colors.primary }]}>
                {job.driverId.phone}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Araç Bilgileri */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="car" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Araç Bilgileri
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Araç:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {job.vehicle.brand} {job.vehicle.model}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Plaka:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {job.vehicle.plateNumber}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Segment:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {job.vehicle.segment}
            </Text>
          </View>
        </Card>

        {/* Paket ve Zamanlama */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Zamanlama
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Paket:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {job.package.name}
            </Text>
          </View>
          {job.scheduling.slotStart ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Slot:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(job.scheduling.slotStart).toLocaleString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ) : job.scheduling.timeWindow ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Zaman Penceresi:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(job.scheduling.timeWindow.start).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                -
                {new Date(job.scheduling.timeWindow.end).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ) : null}
          {job.type === 'mobile' && (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Adres:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {job.location.address}
                </Text>
              </View>
              {job.location.coordinates && (
                <Button
                  title="Navigasyon Başlat"
                  onPress={handleNavigate}
                  icon="navigate"
                  style={styles.navigateButton}
                  variant="outline"
                />
              )}
            </>
          )}
        </Card>

        {/* İş Adımları */}
        {job.status === 'IN_PROGRESS' && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="list" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                İş Adımları
              </Text>
            </View>

            {job.workSteps.map((step, index) => (
              <View key={index} style={[
                styles.stepItem,
                { borderLeftColor: step.status === 'completed' ? '#10B981' : colors.border }
              ]}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepLeft}>
                    <View style={[
                      styles.stepIcon,
                      { backgroundColor: step.status === 'completed' ? '#10B981' : 
                         step.status === 'in_progress' ? '#F59E0B' : colors.border }
                    ]}>
                      <Ionicons
                        name={step.status === 'completed' ? 'checkmark' : 
                             step.status === 'in_progress' ? 'play' : 'ellipse-outline'}
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={[styles.stepName, { color: colors.text }]}>
                      {step.name}
                    </Text>
                  </View>
                  {step.status === 'in_progress' && (
                    <TouchableOpacity
                      style={[styles.completeButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        Alert.prompt(
                          'Adımı Tamamla',
                          'Not eklemek ister misiniz? (Opsiyonel)',
                          (notes) => handleCompleteStep(index, notes || undefined),
                          'plain-text',
                          '',
                          'default'
                        );
                      }}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.completeButtonText}>Tamamla</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {step.completedAt && (
                  <Text style={[styles.stepTime, { color: colors.textSecondary }]}>
                    {new Date(step.completedAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {/* Aksiyonlar */}
        <View style={styles.actionsContainer}>
          {job.status === 'DRIVER_CONFIRMED' && (
            <Button
              title="İşi Kabul Et"
              onPress={handleAcceptJob}
              disabled={actionLoading}
              style={styles.actionButton}
            />
          )}

          {job.status === 'PROVIDER_ACCEPTED' && job.type === 'shop' && (
            <Button
              title="Check-in Yap"
              onPress={handleCheckIn}
              disabled={actionLoading}
              style={styles.actionButton}
            />
          )}

          {job.status === 'CHECK_IN' && (
            <Button
              title="İşlemi Başlat"
              onPress={handleStartWork}
              disabled={actionLoading}
              style={styles.actionButton}
            />
          )}

          {job.status === 'IN_PROGRESS' && 
           job.workSteps.every(s => s.status === 'completed') && (
            <Button
              title="Kalite Kontrol Gönder"
              onPress={() => setShowQAModal(true)}
              disabled={actionLoading}
              style={styles.actionButton}
            />
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* QA Modal */}
      <Modal
        visible={showQAModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQAModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Kalite Kontrol
            </Text>
            <TouchableOpacity onPress={() => setShowQAModal(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.qaInstruction, { color: colors.textSecondary }]}>
              Lütfen işlem öncesi ve sonrası fotoğrafları çekin
            </Text>

            {/* Öncesi Fotoğrafları */}
            <View style={styles.photoSection}>
              <Text style={[styles.photoSectionTitle, { color: colors.text }]}>
                Öncesi Fotoğrafları
              </Text>
              <View style={styles.photoGrid}>
                {job.qa.photosBeforeRequired.map((angle, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.photoBox,
                      {
                        borderColor: photosBefore[index] ? colors.primary : colors.border,
                        backgroundColor: photosBefore[index] ? colors.primary + '10' : colors.inputBackground,
                      }
                    ]}
                    onPress={() => handleTakePhoto('before', index)}
                    disabled={uploadingPhoto}
                  >
                    {photosBefore[index] ? (
                      <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
                    ) : (
                      <Ionicons name="camera" size={32} color={colors.textSecondary} />
                    )}
                    <Text style={[styles.photoBoxLabel, { 
                      color: photosBefore[index] ? colors.primary : colors.textSecondary 
                    }]}>
                      {getPhotoAngleLabel(angle)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sonrası Fotoğrafları */}
            <View style={styles.photoSection}>
              <Text style={[styles.photoSectionTitle, { color: colors.text }]}>
                Sonrası Fotoğrafları
              </Text>
              <View style={styles.photoGrid}>
                {job.qa.photosAfterRequired.map((angle, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.photoBox,
                      {
                        borderColor: photosAfter[index] ? colors.primary : colors.border,
                        backgroundColor: photosAfter[index] ? colors.primary + '10' : colors.inputBackground,
                      }
                    ]}
                    onPress={() => handleTakePhoto('after', index)}
                    disabled={uploadingPhoto}
                  >
                    {photosAfter[index] ? (
                      <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
                    ) : (
                      <Ionicons name="camera" size={32} color={colors.textSecondary} />
                    )}
                    <Text style={[styles.photoBoxLabel, { 
                      color: photosAfter[index] ? colors.primary : colors.textSecondary 
                    }]}>
                      {getPhotoAngleLabel(angle)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title={actionLoading ? "Gönderiliyor..." : "Kalite Kontrol Gönder"}
              onPress={handleSubmitQA}
              disabled={actionLoading || uploadingPhoto}
              style={styles.submitQAButton}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
  },
  headerSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  callButton: {
    padding: spacing.xs,
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
    ...typography.body,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    ...typography.h3,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  errorButton: {
    marginHorizontal: 0,
  },
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.bodyBold,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    ...typography.caption,
    marginBottom: 4,
  },
  statusValue: {
    ...typography.h3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    ...typography.body,
  },
  infoValue: {
    ...typography.bodyBold,
    flex: 1,
    textAlign: 'right',
  },
  stepItem: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    marginBottom: spacing.md,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepName: {
    ...typography.bodyBold,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  completeButtonText: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '600',
  },
  stepTime: {
    ...typography.caption,
    marginTop: spacing.xs,
    marginLeft: 32,
  },
  actionsContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    marginHorizontal: 0,
  },
  navigateButton: {
    marginTop: spacing.md,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h2,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  qaInstruction: {
    ...typography.body,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  photoSection: {
    marginBottom: spacing.lg,
  },
  photoSectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoBox: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBoxLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  submitQAButton: {
    marginTop: spacing.lg,
  },
});

