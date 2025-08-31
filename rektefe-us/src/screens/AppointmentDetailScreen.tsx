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

import { colors, spacing, borderRadius, shadows, typography, dimensions as themeDimensions } from '../theme/theme';
import { Button, LoadingSpinner } from '../components';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Appointment } from '../types/common';

export default function AppointmentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  
  const { appointmentId } = route.params as { appointmentId: string };
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchAppointmentDetails();
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAppointmentById(appointmentId);
      
      if (response.success && response.data) {
        const appointmentData = response.data;
        setAppointment(appointmentData);
      } else {
        Alert.alert('Hata', response.message || 'Randevu detayları yüklenemedi');
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Randevu Detayları</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>Durum</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
              <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
            </View>
          </View>
        </View>

        {/* Appointment Info */}
        {renderInfoSection('Randevu Bilgileri', (
          <>
            {renderInfoRow('Tarih', formatDate(appointment.appointmentDate as string), 'calendar')}
            {renderInfoRow('Saat', formatTime(appointment.appointmentDate as string), 'time')}
            {renderInfoRow('Hizmet Türü', appointment.serviceType, 'construct')}
            {appointment.description && renderInfoRow('Açıklama', appointment.description, 'document-text')}
          </>
        ))}

        {/* Customer Info */}
        {renderInfoSection('Müşteri Bilgileri', (
          <>
            {renderInfoRow('Ad Soyad', `${appointment.customer?.name} ${appointment.customer?.surname}`, 'person')}
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
        {appointment.status === 'pending' && (
          <View style={styles.actionSection}>
            <Button
              title="Kabul Et"
              onPress={handleApprove}
              loading={processing}
              style={[styles.actionButton, { backgroundColor: colors.success.main }] as any}
              textStyle={styles.actionButtonText}
            />
            <Button
              title="Reddet"
              onPress={() => setShowRejectModal(true)}
              loading={processing}
              style={[styles.actionButton, { backgroundColor: colors.error.main }] as any}
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
                style={[styles.modalButton, { backgroundColor: colors.error.main }]}
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
  headerTitle: {
    flex: 1,
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginHorizontal: spacing.md,
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
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
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
});
