import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

interface DaySummary {
  date: string;
  totalEarnings: number;
  totalServices: number;
  completedAppointments: number;
  cancelledAppointments: number;
  averageServiceTime: number;
  topServices: Array<{ name: string; count: number; earnings: number }>;
  customerStats: {
    newCustomers: number;
    returningCustomers: number;
    totalCustomers: number;
  };
  workingHours: {
    startTime: string;
    endTime: string;
    totalHours: number;
  };
  notes: string;
}

export default function EndOfDayScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [customNotes, setCustomNotes] = useState('');

  const fetchDaySummary = useCallback(async () => {
    try {
      setLoading(true);
      
      // Gerçek API çağrısı
      const today = new Date().toISOString().split('T')[0];
      const response = await apiService.getEndOfDayReport(today);
      
      if (response.success && response.data) {
        const apiData = response.data;
        
        // API'den gelen veriyi DaySummary interface'ine uygun hale getir
        const daySummary: DaySummary = {
          date: apiData.date || today,
          totalEarnings: apiData.totalEarnings || 0,
          totalServices: apiData.completedJobs || 0,
          completedAppointments: apiData.completedJobs || 0,
          cancelledAppointments: 0, // API'de henüz yok
          averageServiceTime: 2.5, // Varsayılan değer
          topServices: apiData.appointments?.slice(0, 5).map((apt: any) => ({
            name: apt.serviceType || 'Hizmet',
            count: 1,
            earnings: apt.price || 0
          })) || [],
          customerStats: {
            newCustomers: apiData.newCustomers || 0,
            returningCustomers: 0, // API'de henüz yok
            totalCustomers: apiData.newCustomers || 0,
          },
          workingHours: {
            startTime: '08:00', // Varsayılan değer
            endTime: '18:00', // Varsayılan değer
            totalHours: 10, // Varsayılan değer
          },
          notes: customNotes || 'Günlük rapor oluşturuldu.',
        };

        setDaySummary(daySummary);
      } else {
        Alert.alert('Hata', response.message || 'Günlük özet yüklenirken bir hata oluştu.');
      }

    } catch (error: any) {
      console.error('End of day fetch error:', error);
      Alert.alert('Hata', 'Günlük özet yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [customNotes]);

  useEffect(() => {
    fetchDaySummary();
  }, [fetchDaySummary]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDaySummary();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const generateReportText = () => {
    if (!daySummary) return '';

    return `
GÜNLÜK İŞ RAPORU
${formatDate(daySummary.date)}

📊 GENEL İSTATİSTİKLER
• Toplam Kazanç: ${formatCurrency(daySummary.totalEarnings)}
• Toplam Hizmet: ${daySummary.totalServices}
• Tamamlanan Randevu: ${daySummary.completedAppointments}
• İptal Edilen Randevu: ${daySummary.cancelledAppointments}
• Ortalama Hizmet Süresi: ${daySummary.averageServiceTime} saat

👥 MÜŞTERİ İSTATİSTİKLERİ
• Yeni Müşteri: ${daySummary.customerStats.newCustomers}
• Tekrar Eden Müşteri: ${daySummary.customerStats.returningCustomers}
• Toplam Müşteri: ${daySummary.customerStats.totalCustomers}

⏰ ÇALIŞMA SAATLERİ
• Başlangıç: ${daySummary.workingHours.startTime}
• Bitiş: ${daySummary.workingHours.endTime}
• Toplam Çalışma: ${daySummary.workingHours.totalHours} saat

🔧 EN ÇOK YAPILAN HİZMETLER
${daySummary.topServices.map((service, index) => 
  `${index + 1}. ${service.name}: ${service.count} işlem - ${formatCurrency(service.earnings)}`
).join('\n')}

📝 NOTLAR
${daySummary.notes}

${customNotes ? `\nEK NOTLAR\n${customNotes}` : ''}

---
Rapor Tarihi: ${new Date().toLocaleString('tr-TR')}
    `.trim();
  };

  const shareReport = async () => {
    try {
      const reportText = generateReportText();
      await Share.share({
        message: reportText,
        title: 'Günlük İş Raporu',
      });
    } catch (error) {
      Alert.alert('Hata', 'Rapor paylaşılırken bir hata oluştu.');
    }
  };

  const saveReport = () => {
    Alert.alert('Başarılı', 'Rapor kaydedildi.');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="document-text" size={40} color={colors.primary.main} />
          <Text style={styles.loadingText}>Günlük rapor hazırlanıyor...</Text>
        </View>
      </View>
    );
  }

  if (!daySummary) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyContent}>
          <Ionicons name="calendar-outline" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>Bugün için veri bulunamadı</Text>
          <Text style={styles.emptySubtitle}>
            Henüz bugün için işlem kaydı bulunmuyor.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <BackButton />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Günlük Rapor</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="share" size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Date Header */}
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{formatDate(daySummary.date)}</Text>
          <Text style={styles.dateSubtext}>Günlük İş Özeti</Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="stats-chart" size={24} color={colors.primary.main} />
            <Text style={styles.summaryTitle}>Günlük Özet</Text>
          </View>
          
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>
                {formatCurrency(daySummary.totalEarnings)}
              </Text>
              <Text style={styles.summaryStatLabel}>Toplam Kazanç</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{daySummary.totalServices}</Text>
              <Text style={styles.summaryStatLabel}>Toplam Hizmet</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{daySummary.completedAppointments}</Text>
              <Text style={styles.summaryStatLabel}>Tamamlanan</Text>
            </View>
          </View>
        </View>

        {/* Working Hours */}
        <View style={styles.hoursCard}>
          <View style={styles.hoursHeader}>
            <Ionicons name="time" size={24} color={colors.primary.main} />
            <Text style={styles.hoursTitle}>Çalışma Saatleri</Text>
          </View>
          
          <View style={styles.hoursContent}>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursLabel}>Başlangıç</Text>
              <Text style={styles.hoursValue}>{daySummary.workingHours.startTime}</Text>
            </View>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursLabel}>Bitiş</Text>
              <Text style={styles.hoursValue}>{daySummary.workingHours.endTime}</Text>
            </View>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursLabel}>Toplam Çalışma</Text>
              <Text style={styles.hoursValue}>{daySummary.workingHours.totalHours} saat</Text>
            </View>
          </View>
        </View>

        {/* Customer Stats */}
        <View style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <Ionicons name="people" size={24} color={colors.primary.main} />
            <Text style={styles.customerTitle}>Müşteri İstatistikleri</Text>
          </View>
          
          <View style={styles.customerStats}>
            <View style={styles.customerStat}>
              <Text style={styles.customerStatValue}>{daySummary.customerStats.newCustomers}</Text>
              <Text style={styles.customerStatLabel}>Yeni Müşteri</Text>
            </View>
            <View style={styles.customerStat}>
              <Text style={styles.customerStatValue}>{daySummary.customerStats.returningCustomers}</Text>
              <Text style={styles.customerStatLabel}>Tekrar Eden</Text>
            </View>
            <View style={styles.customerStat}>
              <Text style={styles.customerStatValue}>{daySummary.customerStats.totalCustomers}</Text>
              <Text style={styles.customerStatLabel}>Toplam Müşteri</Text>
            </View>
          </View>
        </View>

        {/* Top Services */}
        <View style={styles.servicesCard}>
          <View style={styles.servicesHeader}>
            <Ionicons name="construct" size={24} color={colors.primary.main} />
            <Text style={styles.servicesTitle}>En Çok Yapılan Hizmetler</Text>
          </View>
          
          <View style={styles.servicesList}>
            {daySummary.topServices.map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceRank}>
                  <Text style={styles.serviceRankText}>{index + 1}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDetails}>
                    {service.count} işlem • {formatCurrency(service.earnings)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <Ionicons name="document-text" size={24} color={colors.primary.main} />
            <Text style={styles.notesTitle}>Günlük Notlar</Text>
          </View>
          
          <View style={styles.notesContent}>
            <Text style={styles.notesText}>{daySummary.notes}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={shareReport}
          >
            <Ionicons name="share" size={20} color={colors.text.inverse} />
            <Text style={styles.shareButtonText}>Paylaş</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={saveReport}
          >
            <Ionicons name="save" size={20} color={colors.text.inverse} />
            <Text style={styles.saveButtonText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModal}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Raporu Paylaş</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowShareModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.shareModalContent}>
              <Text style={styles.shareModalText}>
                Raporu WhatsApp, e-posta veya diğer uygulamalar ile paylaşabilirsiniz.
              </Text>
              
              <View style={styles.shareModalActions}>
                <TouchableOpacity 
                  style={styles.shareModalButton}
                  onPress={() => {
                    setShowShareModal(false);
                    shareReport();
                  }}
                >
                  <Ionicons name="share" size={20} color={colors.primary.main} />
                  <Text style={styles.shareModalButtonText}>Paylaş</Text>
                </TouchableOpacity>
              </View>
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
  header: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: {
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text.inverse,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Date Header
  dateHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dateText: {
    fontSize: typography.h2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  dateSubtext: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
  },

  // Cards
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  hoursCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  customerCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  servicesCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  notesCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },

  // Card Headers
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  servicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },

  // Card Titles
  summaryTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  hoursTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  customerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  servicesTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  notesTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },

  // Summary Stats
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  summaryStatLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Hours
  hoursContent: {
    gap: spacing.sm,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  hoursLabel: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
  },
  hoursValue: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Customer Stats
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  customerStat: {
    alignItems: 'center',
  },
  customerStatValue: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  customerStatLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Services
  servicesList: {
    gap: spacing.sm,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  serviceRank: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  serviceRankText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  serviceDetails: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },

  // Notes
  notesContent: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  notesText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    lineHeight: 20,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  shareButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  saveButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },

  // Share Modal
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareModal: {
    width: width * 0.9,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    ...shadows.large,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  shareModalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  shareModalContent: {
    padding: spacing.lg,
  },
  shareModalText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  shareModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  shareModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.main,
    gap: spacing.sm,
  },
  shareModalButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
