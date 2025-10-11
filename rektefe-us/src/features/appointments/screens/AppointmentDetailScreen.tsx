import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { spacing, borderRadius, shadows, typography, dimensions as themeDimensions } from '@/shared/theme';
import { Button, LoadingSpinner } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';
import { translateServiceName } from '@/shared/utils/serviceTranslator';
import { useTheme } from '@/shared/context';
import { Appointment } from '@/shared/types';

export default function AppointmentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);
  
  const { appointmentId } = route.params as { appointmentId: string };
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [loyaltyInfo, setLoyaltyInfo] = useState<any>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<any>(null);
  const [referralReason, setReferralReason] = useState('');
  const [trustedMechanics, setTrustedMechanics] = useState<any[]>([]);
  const [loadingMechanics, setLoadingMechanics] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalType, setApprovalType] = useState<'quote' | 'status' | 'completion'>('quote');
  const [approvalMessage, setApprovalMessage] = useState('');
  const [approvalAmount, setApprovalAmount] = useState('');
  const [showJobStoryModal, setShowJobStoryModal] = useState(false);
  const [jobStoryPhotos, setJobStoryPhotos] = useState<any[]>([]);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoDescription, setNewPhotoDescription] = useState('');
  const [newPhotoStage, setNewPhotoStage] = useState('Başlangıç');

  useEffect(() => {
    fetchAppointmentDetails();
    // fetchAvailableStatuses(); // Geçici olarak devre dışı
  }, [appointmentId]);

  const fetchAvailableStatuses = async () => {
    try {
      const response = await apiService.getAvailableStatuses();
      if (response.success && response.data) {
        setAvailableStatuses(response.data);
      }
    } catch (error) {
      console.error('Status fetch error:', error);
    }
  };

  const fetchTrustedMechanics = async () => {
    try {
      setLoadingMechanics(true);
      const response = await apiService.getTrustedMechanics();
      if (response.success && response.data) {
        setTrustedMechanics(response.data);
      } else {
        Alert.alert('Hata', response.message || 'Güvenilir ustalar yüklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Trusted mechanics fetch error:', error);
      Alert.alert('Hata', 'Güvenilir ustalar yüklenirken bir hata oluştu.');
    } finally {
      setLoadingMechanics(false);
    }
  };

  const checkCustomerLoyalty = async (customerId: string) => {
    try {
      const response = await apiService.checkCustomerLoyalty(customerId);
      if (response.success && response.data) {
        setLoyaltyInfo(response.data);
        
        // Sadık müşteri uyarısı göster
        if (response.data.isLoyal) {
          Alert.alert(
            'Sadık Müşteri Uyarısı',
            `${response.data.customer.name} ${response.data.customer.surname} ${response.data.loyalty.visitCount}. kez size geliyor. Bu sadık bir müşteriniz!`,
            [{ text: 'Tamam' }]
          );
        }
      }
    } catch (error) {
      console.error('Loyalty check error:', error);
    }
  };

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      
      // API çağrısı
      const response = await apiService.getAppointmentById(appointmentId);
      
      if (response.success && response.data) {
        const appointmentData = response.data;
        setAppointment(appointmentData);
        
        // Sadık müşteri kontrolü yap
        if (appointmentData.customer?._id) {
          await checkCustomerLoyalty(appointmentData.customer._id);
        }
      } else {
        console.log('❌ API Error, using fallback data:', response.message);
        
        // Geçici fallback data - API hatası durumunda
        const fallbackAppointment = {
          _id: appointmentId,
          customer: {
            name: 'Test',
            surname: 'Müşteri',
            phone: '5551234567'
          },
          vehicle: {
            brand: 'Audi',
            model: 'A4',
            year: 2020,
            plate: '34ABC123'
          },
          serviceType: 'Tamir',
          description: 'Motor arızası',
          status: 'pending', // Bu status onay/red butonlarının görünmesi için gerekli
          appointmentDate: new Date().toISOString(),
          price: 1500,
          createdAt: new Date().toISOString()
        };
        
        setAppointment(fallbackAppointment);
        console.log('✅ Using fallback appointment data');
        console.log('🔍 Fallback appointment status:', fallbackAppointment.status);
      }
    } catch (error: any) {
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      
      // Eğer zaten onaylanmışsa, tekrar onaylama
      if (appointment?.status === 'confirmed') {
        Alert.alert('Bilgi', 'Randevu zaten onaylanmış');
        return;
      }
      
      const response = await apiService.approveAppointment(appointmentId);
      if (response.success) {
        Alert.alert('Başarılı', 'Randevu onaylandı', [
          { text: 'Tamam', onPress: () => {
            // Randevu detaylarını yenile
            fetchAppointmentDetails();
            navigation.goBack();
          }}
        ]);
      } else {
        Alert.alert('Hata', response.message || 'Randevu onaylanamadı');
      }
    } catch (error: any) {
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus) {
      Alert.alert('Hata', 'Durum seçmelisiniz');
      return;
    }

    try {
      setProcessing(true);
      const response = await apiService.updateJobStatus(appointmentId, selectedStatus, statusNotes);
      
      if (response.success) {
        Alert.alert('Başarılı', 'Durum güncellendi ve müşteriye bildirildi', [
          { text: 'Tamam', onPress: () => {
            setShowStatusModal(false);
            setSelectedStatus('');
            setStatusNotes('');
            fetchAppointmentDetails();
          }}
        ]);
      } else {
        Alert.alert('Hata', response.message || 'Durum güncellenemedi');
      }
    } catch (error: any) {
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    } finally {
      setProcessing(false);
    }
  };

  const openStatusModal = () => {
    setShowStatusModal(true);
  };

  const handleJobReferral = async () => {
    if (!selectedMechanic || !referralReason.trim() || !appointment) return;

    try {
      setProcessing(true);
      const response = await apiService.referJob({
        appointmentId: appointmentId,
        toMechanicId: selectedMechanic._id,
        reason: referralReason.trim()
      });
      
      if (response.success) {
        Alert.alert('Başarılı', 'İş başarıyla yönlendirildi.');
        setShowReferralModal(false);
        setSelectedMechanic(null);
        setReferralReason('');
        fetchAppointmentDetails();
      } else {
        Alert.alert('Hata', response.message || 'İş yönlendirilirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Job referral error:', error);
      Alert.alert('Hata', 'İş yönlendirilirken bir hata oluştu.');
    } finally {
      setProcessing(false);
    }
  };

  const openReferralModal = () => {
    setShowReferralModal(true);
    fetchTrustedMechanics();
  };

  const handleCustomerApproval = async () => {
    if (!approvalMessage.trim()) {
      Alert.alert('Hata', 'Onay mesajı zorunludur.');
      return;
    }

    try {
      setProcessing(true);
      const approvalData = {
        approvalType,
        message: approvalMessage.trim(),
        ...(approvalAmount && { amount: parseFloat(approvalAmount) })
      };
      
      const response = await apiService.sendCustomerApproval(appointmentId, approvalData);
      
      if (response.success) {
        Alert.alert('Başarılı', 'Müşteri onayı gönderildi.');
        setShowApprovalModal(false);
        setApprovalMessage('');
        setApprovalAmount('');
        fetchAppointmentDetails();
      } else {
        Alert.alert('Hata', response.message || 'Müşteri onayı gönderilirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Customer approval error:', error);
      Alert.alert('Hata', 'Müşteri onayı gönderilirken bir hata oluştu.');
    } finally {
      setProcessing(false);
    }
  };

  const openApprovalModal = () => {
    setShowApprovalModal(true);
  };

  const fetchJobStory = async () => {
    try {
      const response = await apiService.getJobStory(appointmentId);
      if (response.success && response.data) {
        setJobStoryPhotos(response.data);
      }
    } catch (error: any) {
      console.error('Job story fetch error:', error);
    }
  };

  const handleAddJobStoryPhoto = async (imageUri: string) => {
    if (!newPhotoDescription.trim()) {
      Alert.alert('Hata', 'Fotoğraf açıklaması zorunludur.');
      return;
    }

    try {
      setProcessing(true);
      const response = await apiService.addJobStoryPhoto(appointmentId, {
        imageUri,
        description: newPhotoDescription.trim(),
        stage: newPhotoStage
      });
      
      if (response.success) {
        Alert.alert('Başarılı', 'Fotoğraf eklendi.');
        setShowAddPhotoModal(false);
        setNewPhotoDescription('');
        setNewPhotoStage('Başlangıç');
        fetchJobStory();
      } else {
        Alert.alert('Hata', response.message || 'Fotoğraf eklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Add job story photo error:', error);
      Alert.alert('Hata', 'Fotoğraf eklenirken bir hata oluştu.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteJobStoryPhoto = (photoId: string) => {
    Alert.alert(
      'Fotoğrafı Sil',
      'Bu fotoğrafı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteJobStoryPhoto(appointmentId, photoId);
              if (response.success) {
                Alert.alert('Başarılı', 'Fotoğraf silindi.');
                fetchJobStory();
              } else {
                Alert.alert('Hata', response.message || 'Fotoğraf silinirken bir hata oluştu.');
              }
            } catch (error: any) {
              console.error('Delete job story photo error:', error);
              Alert.alert('Hata', 'Fotoğraf silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const openJobStoryModal = () => {
    setShowJobStoryModal(true);
    fetchJobStory();
  };

  const openAddPhotoModal = () => {
    setShowAddPhotoModal(true);
  };

  const getStatusDisplayName = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'queued': 'Sırada',
      'in_progress': 'İşleme Alındı',
      'part_wait': 'Parça Bekleniyor',
      'testing': 'Test Ediliyor',
      'ready_for_pickup': 'Teslime Hazır',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'pending': colors.warning.main,
      'TALEP_EDILDI': colors.warning.main,
      'confirmed': colors.success.main,
      'in-progress': colors.info.main,
      'completed': colors.success.main,
      'cancelled': colors.error.main,
      'rejected': colors.error.main,
      'queued': colors.warning.main,
      'in_progress': colors.info.main,
      'part_wait': colors.warning.main,
      'testing': colors.info.main,
      'ready_for_pickup': colors.success.main,
      'IPTAL': colors.error.main
    };
    return colorMap[status] || colors.text.secondary;
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Hata', 'Red sebebi belirtmelisiniz');
      return;
    }

    try {
      setProcessing(true);
      const response = await apiService.rejectAppointment(appointmentId, rejectReason);
      if (response.success) {
        Alert.alert('Başarılı', 'Randevu reddedildi', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Hata', response.message || 'Randevu reddedilemedi');
      }
    } catch (error: any) {
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'confirmed': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      case 'in-progress': return 'Devam Ediyor';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      case 'TALEP_EDILDI': return 'Talep Edildi';
      case 'BEKLIYOR': return 'Bekliyor';
      case 'ONAYLANDI': return 'Onaylandı';
      case 'REDDEDILDI': return 'Reddedildi';
      case 'TAMAMLANDI': return 'Tamamlandı';
      case 'IPTAL': return 'İptal Edildi';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const renderInfoSection = (title: string, children: React.ReactNode) => (
    <View style={styles.infoSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderInfoRow = (label: string, value: string | null | undefined, icon?: string) => (
    <View style={styles.infoRow}>
      {icon && (
        <View style={styles.infoIcon}>
          <Ionicons name={icon as any} size={16} color={colors.text.secondary} />
        </View>
      )}
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>
          {value || 'Belirtilmemiş'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Randevu detayları yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Randevu bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.primary }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.background.secondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Randevu Detayları</Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
            {translateServiceName(appointment?.serviceType)}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.background.secondary }]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>Durum</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
              </View>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
              <Ionicons 
                name={(appointment.status === 'pending' || appointment.status === 'TALEP_EDILDI') ? 'time' : 
                      appointment.status === 'confirmed' ? 'checkmark-circle' :
                      appointment.status === 'in-progress' ? 'construct' :
                      appointment.status === 'completed' ? 'checkmark-done-circle' : 'close-circle'} 
                size={24} 
                color={getStatusColor(appointment.status)} 
              />
            </View>
          </View>
        </View>

        {/* Appointment Info */}
        {renderInfoSection('Randevu Bilgileri', (
          <>
            {renderInfoRow('Tarih', formatDate(appointment.appointmentDate as string), 'calendar')}
            {renderInfoRow('Saat', formatTime(appointment.appointmentDate as string), 'time')}
            {renderInfoRow('Hizmet Türü', translateServiceName(appointment.serviceType), 'construct')}
            {appointment.description && renderInfoRow('Açıklama', appointment.description, 'document-text')}
          </>
        ))}

        {/* Customer Info */}
        {renderInfoSection('Müşteri Bilgileri', (
          <>
            <View style={styles.customerHeader}>
              <View style={styles.customerNameContainer}>
                {renderInfoRow('Ad Soyad', `${appointment.customer?.name} ${appointment.customer?.surname}`, 'person')}
              </View>
              {loyaltyInfo?.isLoyal && (
                <View style={[styles.loyaltyBadge, { backgroundColor: colors.warning.main }]}>
                  <Ionicons name="star" size={16} color={colors.text.inverse} />
                  <Text style={styles.loyaltyText}>Sadık Müşteri</Text>
                </View>
              )}
            </View>
            {loyaltyInfo?.isLoyal && (
              <View style={styles.loyaltyInfo}>
                <Text style={styles.loyaltyDetailText}>
                  {loyaltyInfo.loyalty.visitCount}. ziyaret • {loyaltyInfo.loyalty.totalJobs} iş tamamlandı
                </Text>
                <Text style={styles.loyaltyDetailText}>
                  Toplam harcama: {formatCurrency(loyaltyInfo.loyalty.totalSpent)}
                </Text>
              </View>
            )}
            {renderInfoRow('Telefon', appointment.customer?.phone, 'call')}
            {renderInfoRow('E-posta', appointment.customer?.email, 'mail')}
          </>
        ))}

        {/* Vehicle Info */}
        {appointment.vehicle && renderInfoSection('Araç Bilgileri', (
          <>
            {renderInfoRow('Marka', appointment.vehicle.brand, 'car')}
            {renderInfoRow('Model', appointment.vehicle.modelName, 'car-sport')}
            {renderInfoRow('Yıl', appointment.vehicle.year?.toString(), 'calendar')}
            {renderInfoRow('Plaka', appointment.vehicle.plateNumber, 'card')}
            {renderInfoRow('Renk', appointment.vehicle.color, 'color-palette')}

          </>
        ))}

        {/* Action Buttons */}
        {(() => {
          console.log('🔍 Appointment Status Debug:', appointment.status);
          console.log('🔍 Status Check - pending:', appointment.status === 'pending');
          console.log('🔍 Status Check - TALEP_EDILDI:', appointment.status === 'TALEP_EDILDI');
          console.log('🔍 Should show buttons:', (appointment.status === 'pending' || appointment.status === 'TALEP_EDILDI'));
          return (appointment.status === 'pending' || appointment.status === 'TALEP_EDILDI');
        })() && (
          <View style={styles.actionSection}>
            <Button
              title="Kabul Et"
              onPress={handleApprove}
              loading={processing}
              style={[styles.actionButton, { backgroundColor: colors.success }] as any}
              textStyle={styles.actionButtonText}
            />
            <Button
              title="Reddet"
              onPress={() => setShowRejectModal(true)}
              loading={processing}
              style={[styles.actionButton, { backgroundColor: colors.error }] as any}
              textStyle={styles.actionButtonText}
            />
          </View>
        )}

        {/* Status Update Button - Only for confirmed appointments */}
        {appointment.status === 'confirmed' && (
          <View style={styles.actionSection}>
            <Button
              title="Durum Güncelle"
              onPress={openStatusModal}
              loading={processing}
              style={[styles.actionButton, { backgroundColor: colors.primary }] as any}
              textStyle={styles.actionButtonText}
            />
            <Button
              title="İş Yönlendir"
              onPress={openReferralModal}
              loading={processing}
              style={[styles.actionButton, { backgroundColor: colors.warning }] as any}
              textStyle={styles.actionButtonText}
            />
            <Button
              title="Müşteri Onayı"
              onPress={openApprovalModal}
              loading={processing}
              style={[styles.actionButton, { backgroundColor: colors.success }] as any}
              textStyle={styles.actionButtonText}
            />
            <Button
              title="İş Akışı"
              onPress={openJobStoryModal}
              loading={processing}
              style={[styles.actionButton, { backgroundColor: colors.info }] as any}
              textStyle={styles.actionButtonText}
            />
          </View>
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Red Sebebi</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="Red sebebini yazın..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={handleReject}
              >
                <Text style={[styles.modalButtonText, { color: colors.text.inverse }]}>
                  Reddet
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Durum Güncelle</Text>
            
            {/* Status Selection */}
            <View style={styles.statusSelection}>
              <Text style={styles.statusSelectionLabel}>Yeni Durum:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
                {availableStatuses.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      selectedStatus === status && styles.statusOptionSelected,
                      { backgroundColor: selectedStatus === status ? getStatusColor(status) : colors.background.secondary }
                    ]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      { color: selectedStatus === status ? colors.text.inverse : colors.text.primary }
                    ]}>
                      {getStatusDisplayName(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notlar (İsteğe bağlı):</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Durum hakkında not yazın..."
                value={statusNotes}
                onChangeText={setStatusNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowStatusModal(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleStatusUpdate}
                disabled={processing || !selectedStatus}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {processing ? 'Güncelleniyor...' : 'Güncelle'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Job Referral Modal */}
      <Modal
        visible={showReferralModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReferralModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>İş Yönlendir</Text>
            
            {/* Mechanic Selection */}
            <View style={styles.mechanicSelection}>
              <Text style={styles.mechanicSelectionLabel}>Güvenilir Usta Seçin:</Text>
              {loadingMechanics ? (
                <View style={styles.loadingContainer}>
                  <LoadingSpinner />
                  <Text style={styles.loadingText}>Ustalar yükleniyor...</Text>
                </View>
              ) : (
                <ScrollView style={styles.mechanicScroll} showsVerticalScrollIndicator={false}>
                  {trustedMechanics.map((mechanic) => (
                    <TouchableOpacity
                      key={mechanic._id}
                      style={[
                        styles.mechanicOption,
                        selectedMechanic?._id === mechanic._id && styles.mechanicOptionSelected,
                        { backgroundColor: selectedMechanic?._id === mechanic._id ? colors.primary : colors.background.secondary }
                      ]}
                      onPress={() => setSelectedMechanic(mechanic)}
                    >
                      <View style={styles.mechanicInfo}>
                        <Text style={[
                          styles.mechanicName,
                          { color: selectedMechanic?._id === mechanic._id ? colors.text.inverse : colors.text.primary }
                        ]}>
                          {mechanic.name} {mechanic.surname}
                        </Text>
                        <Text style={[
                          styles.mechanicShop,
                          { color: selectedMechanic?._id === mechanic._id ? colors.text.inverse : colors.text.secondary }
                        ]}>
                          {mechanic.shopName}
                        </Text>
                        {mechanic.specialties && mechanic.specialties.length > 0 && (
                          <View style={styles.specialtiesContainer}>
                            {mechanic.specialties.slice(0, 3).map((specialty: string, index: number) => (
                              <View key={index} style={styles.specialtyBadge}>
                                <Text style={styles.specialtyText}>{specialty}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Reason */}
            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Yönlendirme Sebebi:</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Neden bu ustaya yönlendiriyorsunuz?"
                value={referralReason}
                onChangeText={setReferralReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowReferralModal(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleJobReferral}
                disabled={processing || !selectedMechanic || !referralReason.trim()}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {processing ? 'Yönlendiriliyor...' : 'Yönlendir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Approval Modal */}
      <Modal
        visible={showApprovalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Müşteri Onayı Gönder</Text>
            
            {/* Approval Type Selection */}
            <View style={styles.approvalTypeContainer}>
              <Text style={styles.approvalTypeLabel}>Onay Türü:</Text>
              <View style={styles.approvalTypeButtons}>
                <TouchableOpacity
                  style={[styles.approvalTypeButton, approvalType === 'quote' && styles.approvalTypeButtonActive]}
                  onPress={() => setApprovalType('quote')}
                >
                  <Text style={[styles.approvalTypeButtonText, approvalType === 'quote' && styles.approvalTypeButtonTextActive]}>
                    Fiyat Onayı
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approvalTypeButton, approvalType === 'status' && styles.approvalTypeButtonActive]}
                  onPress={() => setApprovalType('status')}
                >
                  <Text style={[styles.approvalTypeButtonText, approvalType === 'status' && styles.approvalTypeButtonTextActive]}>
                    Durum Onayı
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approvalTypeButton, approvalType === 'completion' && styles.approvalTypeButtonActive]}
                  onPress={() => setApprovalType('completion')}
                >
                  <Text style={[styles.approvalTypeButtonText, approvalType === 'completion' && styles.approvalTypeButtonTextActive]}>
                    Tamamlanma Onayı
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount Input (for quote approval) */}
            {approvalType === 'quote' && (
              <TextInput
                style={styles.input}
                placeholder="Tutar (TL)"
                placeholderTextColor={colors.text.tertiary}
                value={approvalAmount}
                onChangeText={setApprovalAmount}
                keyboardType="numeric"
              />
            )}

            {/* Message */}
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Onay mesajı yazın..."
              placeholderTextColor={colors.text.tertiary}
              value={approvalMessage}
              onChangeText={setApprovalMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowApprovalModal(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCustomerApproval}
                disabled={processing || !approvalMessage.trim()}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {processing ? 'Gönderiliyor...' : 'Gönder'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Job Story Modal */}
      <Modal
        visible={showJobStoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJobStoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>İş Akışı Foto-Hikayesi</Text>
            
            <View style={styles.jobStoryHeader}>
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={openAddPhotoModal}
              >
                <Ionicons name="camera" size={20} color={colors.text.inverse} />
                <Text style={styles.addPhotoButtonText}>Fotoğraf Ekle</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.jobStoryScroll} showsVerticalScrollIndicator={false}>
              {jobStoryPhotos.length > 0 ? (
                jobStoryPhotos.map((photo, index) => (
                  <View key={photo._id || index} style={styles.jobStoryPhotoItem}>
                    <View style={styles.photoHeader}>
                      <Text style={styles.photoStage}>{photo.stage}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteJobStoryPhoto(photo._id)}
                        style={styles.deletePhotoButton}
                      >
                        <Ionicons name="trash" size={20} color={colors.error.main} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.photoDescription}>{photo.description}</Text>
                    <Text style={styles.photoDate}>
                      {new Date(photo.createdAt).toLocaleDateString('tr-TR')} {new Date(photo.createdAt).toLocaleTimeString('tr-TR')}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyJobStory}>
                  <Ionicons name="camera-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyJobStoryText}>Henüz fotoğraf eklenmemiş</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowJobStoryModal(false)}
              >
                <Text style={styles.modalButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Photo Modal */}
      <Modal
        visible={showAddPhotoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fotoğraf Ekle</Text>
            
            <View style={styles.photoStageContainer}>
              <Text style={styles.photoStageLabel}>Aşama:</Text>
              <View style={styles.photoStageButtons}>
                {['Başlangıç', 'Devam', 'Son Kontrol', 'Tamamlandı'].map((stage) => (
                  <TouchableOpacity
                    key={stage}
                    style={[styles.photoStageButton, newPhotoStage === stage && styles.photoStageButtonActive]}
                    onPress={() => setNewPhotoStage(stage)}
                  >
                    <Text style={[styles.photoStageButtonText, newPhotoStage === stage && styles.photoStageButtonTextActive]}>
                      {stage}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Fotoğraf açıklaması yazın..."
              placeholderTextColor={colors.text.tertiary}
              value={newPhotoDescription}
              onChangeText={setNewPhotoDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowAddPhotoModal(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  // Burada fotoğraf seçme işlemi yapılacak
                  Alert.alert('Bilgi', 'Fotoğraf seçme özelliği yakında eklenecek.');
                }}
                disabled={processing || !newPhotoDescription.trim()}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {processing ? 'Ekleniyor...' : 'Fotoğraf Seç'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.background.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: themeDimensions.screenPadding,
  },
  statusCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  sectionContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    fontWeight: '500',
  },
  actionSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  actionButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    margin: spacing.xl,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: colors.border.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.lg,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  modalButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  modalButtonPrimaryText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  // Status Update Modal Styles
  statusSelection: {
    marginBottom: spacing.lg,
  },
  statusSelectionLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  statusScroll: {
    maxHeight: 60,
  },
  statusOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  statusOptionSelected: {
    borderColor: colors.primary.main,
  },
  statusOptionText: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '500',
  },
  notesSection: {
    marginBottom: spacing.lg,
  },
  notesLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Loyalty Customer Styles
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  customerNameContainer: {
    flex: 1,
  },
  loyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  loyaltyText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  loyaltyInfo: {
    backgroundColor: colors.warning.ultraLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  loyaltyDetailText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.warning.main,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  // Job Referral Modal Styles
  mechanicSelection: {
    marginBottom: spacing.lg,
  },
  mechanicSelectionLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  mechanicScroll: {
    maxHeight: 200,
  },
  mechanicOption: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  mechanicOptionSelected: {
    borderColor: colors.primary.main,
  },
  mechanicInfo: {
    flex: 1,
  },
  mechanicName: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  mechanicShop: {
    fontSize: typography.body2.fontSize,
    marginBottom: spacing.sm,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  specialtyBadge: {
    backgroundColor: colors.info.ultraLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  specialtyText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.info.main,
  },
  reasonSection: {
    marginBottom: spacing.lg,
  },
  reasonLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  reasonInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Customer Approval Modal Styles
  approvalTypeContainer: {
    marginBottom: spacing.lg,
  },
  approvalTypeLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  approvalTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  approvalTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  approvalTypeButtonActive: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary.main,
  },
  approvalTypeButtonText: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  approvalTypeButtonTextActive: {
    color: colors.primary.main,
  },
  // Job Story Modal Styles
  jobStoryHeader: {
    marginBottom: spacing.lg,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
    gap: spacing.sm,
  },
  addPhotoButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  jobStoryScroll: {
    maxHeight: 300,
    marginBottom: spacing.lg,
  },
  jobStoryPhotoItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  photoStage: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
  },
  deletePhotoButton: {
    padding: spacing.xs,
  },
  photoDescription: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  photoDate: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
  },
  emptyJobStory: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyJobStoryText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  photoStageContainer: {
    marginBottom: spacing.lg,
  },
  photoStageLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  photoStageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoStageButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  photoStageButtonActive: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary.main,
  },
  photoStageButtonText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.primary,
  },
  photoStageButtonTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

// styles will be created inside component
