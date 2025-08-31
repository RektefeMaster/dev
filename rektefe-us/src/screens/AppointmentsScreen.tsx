import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  StatusBar,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, shadows, dimensions as themeDimensions } from '../theme/theme';
import { Button, Card, LoadingSpinner, EmptyState, BackButton } from '../components';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Appointment } from '../types/common';

type TabType = 'pending' | 'approved' | 'completed';

export default function AppointmentsScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPrice, setCompletionPrice] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchAppointments();
    }
  }, [isAuthenticated, activeTab]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let response;

      switch (activeTab) {
        case 'pending':
          response = await apiService.getMechanicAppointments('pending');
          break;
        case 'approved':
          response = await apiService.getMechanicAppointments('confirmed');
          break;
        case 'completed':
          response = await apiService.getMechanicAppointments('completed');
          break;
        default:
          response = await apiService.getMechanicAppointments('pending');
      }

      if (response.success) {
        const appointmentsData = (response.data as any)?.appointments || response.data || [];
        
        // Debug: Gerçek veriyi detaylı göster
        console.log('🔍 Appointments Data Length:', appointmentsData.length);
        if (appointmentsData.length > 0) {
          console.log('🔍 First Appointment Details:', JSON.stringify(appointmentsData[0], null, 2));
          console.log('🔍 First Appointment Date:', appointmentsData[0]?.appointmentDate);
          console.log('🔍 First Appointment Status:', appointmentsData[0]?.status);
        }
        
        setAppointments(appointmentsData);
      } else {
        setAppointments([]);
      }
    } catch (error: any) {
      console.error('Appointments fetch error:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const handleAppointmentPress = (appointment: any) => {
    (navigation as any).navigate('AppointmentDetail', { appointmentId: appointment._id });
  };

  const handleApproveAppointment = async (appointment: any) => {
    try {
      const response = await apiService.approveAppointment(appointment._id);
      if (response.success) {
      }
    } catch (error) {
      console.error('Approve error:', error);
    }
  };

  const handleRejectAppointment = async (appointment: any) => {
    try {
      const response = await apiService.rejectAppointment(appointment._id, 'Müsait değil');
      if (response.success) {
      }
    } catch (error) {
      console.error('Reject error:', error);
    }
  };

  const handleCompleteJob = async (appointmentId: string) => {
    // Randevu bilgilerini bul
    const appointment = appointments.find(apt => apt._id === appointmentId);
    
    if (!appointment) {
      Alert.alert('Hata', 'Randevu bulunamadı');
      return;
    }

    // Status kontrolü
    if (appointment.status === 'completed') {
      Alert.alert('Bilgi', 'Bu iş zaten tamamlanmış');
      return;
    }

    if (appointment.status === 'cancelled' || appointment.status === 'rejected') {
      Alert.alert('Hata', 'İptal edilmiş veya reddedilmiş randevular tamamlanamaz');
      return;
    }

    // Modal için state ekleyelim
    setShowCompleteModal(true);
    setSelectedAppointmentId(appointmentId);
  };

  const handleSubmitCompletion = async () => {
    if (!completionNotes.trim() || !completionPrice.trim()) {
      Alert.alert('Hata', 'Lütfen not ve ücret bilgilerini giriniz');
      return;
    }

    const price = parseFloat(completionPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Hata', 'Geçerli bir ücret giriniz');
      return;
    }

    try {
      console.log('🔧 İş tamamlama başlatılıyor:', {
        appointmentId: selectedAppointmentId,
        price,
        notes: completionNotes.trim()
      });

      const response = await apiService.completeAppointment(selectedAppointmentId, {
        price,
        mechanicNotes: completionNotes.trim()
      });
      
      if (response.success) {
        Alert.alert('Başarılı', 'İş tamamlandı ve müşteriye bildirildi', [
          { 
            text: 'Tamam', 
            onPress: () => {
              setShowCompleteModal(false);
              setCompletionNotes('');
              setCompletionPrice('');
              setSelectedAppointmentId('');
              // Randevuları yenile
              fetchAppointments();
            }
          }
        ]);
      } else {
        Alert.alert('Hata', response.message || 'İş tamamlanamadı');
      }
    } catch (error: any) {
      console.error('İş tamamlama hatası:', error);
      
      // API hatası detaylarını göster
      let errorMessage = 'İş tamamlanırken bir hata oluştu';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Hata', errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning.main;
      case 'confirmed': return colors.success.main;
      case 'rejected': return colors.error.main;
      case 'in-progress': return colors.primary.main;
      case 'completed': return colors.secondary.main;
      case 'cancelled': return colors.text.tertiary;
      default: return colors.text.tertiary;
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
      default: return status;
    }
  };

  const renderTabButton = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={activeTab === tab ? colors.primary.main : colors.text.secondary} 
      />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderAppointmentCard = (item: any) => {
    // Debug: Her item'ı kontrol et
    console.log('🔍 Rendering appointment:', {
      id: item._id,
      date: item.appointmentDate,
      dateType: typeof item.appointmentDate,
      parsedDate: item.appointmentDate ? new Date(item.appointmentDate) : null,
      isValidDate: item.appointmentDate ? !isNaN(new Date(item.appointmentDate).getTime()) : false,
      status: item.status,
      customer: item.customer?.name,
      vehicle: item.vehicle?.brand,
      hasVehicle: !!item.vehicle,
      vehicleDetails: item.vehicle ? {
        brand: item.vehicle.brand,
        model: item.vehicle.modelName,
        plate: item.vehicle.plateNumber,
        year: item.vehicle.year
      } : 'No vehicle data'
    });
    
    return (
    <Card style={styles.appointmentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.timeSection}>
          <Text style={styles.timeText}>
            {item.timeSlot || 
              (item.appointmentDate ? 
                (() => {
                  try {
                    const date = new Date(item.appointmentDate);
                    if (isNaN(date.getTime())) {
                      return 'Geçersiz tarih';
                    }
                    return date.toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  } catch (error) {
                    return 'Tarih hatası';
                  }
                })() : 
                'Saat belirtilmemiş'
              )
            }
          </Text>
          <Text style={styles.dateText}>
            {item.appointmentDate ? 
              (() => {
                try {
                  const date = new Date(item.appointmentDate);
                  if (isNaN(date.getTime())) {
                    return 'Geçersiz tarih';
                  }
                  return date.toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: 'short'
                  });
                } catch (error) {
                  return 'Tarih hatası';
                }
              })() : 
              'Tarih belirtilmemiş'
            }
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.customerSection}>
        <Text style={styles.customerName}>
          {item.customer?.name} {item.customer?.surname}
        </Text>
        <Text style={styles.customerPhone}>
          {item.customer?.phone || 'Telefon bilgisi yok'}
        </Text>
      </View>

      <View style={styles.vehicleSection}>
        <View style={styles.vehicleHeader}>
          <Ionicons name="car" size={16} color={colors.primary.main} />
          <Text style={styles.vehicleTitle}>Araç Bilgileri</Text>
        </View>
        <Text style={styles.vehicleText}>
          {item.vehicle?.brand} {item.vehicle?.modelName} ({item.vehicle?.year})
        </Text>
        <Text style={styles.plateText}>
          {item.vehicle?.plateNumber || 'Plaka bilgisi yok'}
        </Text>
        {item.vehicle?.fuelType && (
          <Text style={styles.vehicleDetails}>
            {item.vehicle.fuelType} • {item.vehicle.engineType} • {item.vehicle.transmission}
          </Text>
        )}
        {item.vehicle?.mileage && (
          <Text style={styles.vehicleDetails}>
            Kilometre: {item.vehicle.mileage.toLocaleString('tr-TR')} km
          </Text>
        )}

      </View>

      <View style={styles.serviceSection}>
        <Text style={styles.serviceText}>
          {item.serviceType || 'Genel Bakım'}
        </Text>
        {item.description && (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <Button
            title="Kabul Et"
            onPress={() => handleApproveAppointment(item)}
                         style={[styles.actionButton, { backgroundColor: colors.success.main }] as any}
            textStyle={styles.actionButtonText}
          />
          <Button
            title="Reddet"
            onPress={() => handleRejectAppointment(item)}
                         style={[styles.actionButton, { backgroundColor: colors.error.main }] as any}
            textStyle={styles.actionButtonText}
          />
        </View>
      )}

      {/* Onaylanan randevularda "İşi Tamamla" butonu - SADECE "Onaylanan" tab'ında */}
      {activeTab === 'approved' && item.status === 'confirmed' && (
        <View style={styles.actionButtons}>
          <Button
            title="İşi Tamamla"
            onPress={() => handleCompleteJob(item._id)}
            style={[styles.actionButton, { backgroundColor: colors.primary.main }] as any}
            textStyle={styles.actionButtonText}
          />
        </View>
      )}

      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => handleAppointmentPress(item)}
      >
        <Text style={styles.detailsButtonText}>Detayları Gör</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary.main} />
      </TouchableOpacity>
    </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>İşler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>İşlerim</Text>
            <Text style={styles.headerSubtitle}>Randevular ve iş takibi</Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('pending', 'Bekleyen', 'time')}
        {renderTabButton('approved', 'Onaylanan', 'checkmark-circle')}
        {renderTabButton('completed', 'Tamamlanan', 'checkmark-done')}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlatList
          data={appointments}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => renderAppointmentCard(item)}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary.main]}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="car-outline"
              title={`${getStatusText(activeTab === 'pending' ? 'pending' : activeTab === 'approved' ? 'confirmed' : 'completed')} iş bulunamadı`}
              subtitle="Henüz bu kategoride iş bulunmuyor"
            />
          }
        />
      </View>

      {/* İş Tamamlama Modal */}
      <Modal
        visible={showCompleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>İş Tamamlandı</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notlar (en az 10 karakter)</Text>
              <TextInput
                style={styles.textInput}
                value={completionNotes}
                onChangeText={setCompletionNotes}
                placeholder="İş hakkında notlarınızı girin..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ücret (TL)</Text>
              <TextInput
                style={styles.textInput}
                value={completionPrice}
                onChangeText={setCompletionPrice}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowCompleteModal(false);
                  setCompletionNotes('');
                  setCompletionPrice('');
                  setSelectedAppointmentId('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitModalButton]}
                onPress={handleSubmitCompletion}
              >
                <Text style={styles.submitModalButtonText}>Tamamla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  header: {
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.background.primary,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  activeTabButton: {
    backgroundColor: colors.primary.ultraLight,
  },
  tabText: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  activeTabText: {
    color: colors.primary.main,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: themeDimensions.screenPadding,
  },
  appointmentCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  timeSection: {
    alignItems: 'flex-start',
  },
  timeText: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  dateText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  customerSection: {
    marginBottom: spacing.md,
  },
  customerName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  customerPhone: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
  },
  vehicleSection: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  vehicleTitle: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  vehicleDetails: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  vehicleText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  plateText: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
  },
  serviceSection: {
    marginBottom: spacing.md,
  },
  serviceText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  descriptionText: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    marginTop: spacing.sm,
  },
  detailsButtonText: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
    marginRight: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  inputContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    backgroundColor: colors.text.tertiary,
    marginRight: spacing.sm,
  },
  cancelModalButtonText: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  submitModalButton: {
    backgroundColor: colors.primary.main,
    marginLeft: spacing.sm,
  },
  submitModalButtonText: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
