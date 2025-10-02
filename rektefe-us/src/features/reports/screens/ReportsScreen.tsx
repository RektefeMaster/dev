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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

interface ReportData {
  weeklyEarnings: number;
  monthlyEarnings: number;
  yearlyEarnings: number;
  totalAppointments: number;
  completedAppointments: number;
  averageRating: number;
  topServices: Array<{ name: string; count: number; earnings: number }>;
  customerStats: {
    newCustomers: number;
    returningCustomers: number;
    totalCustomers: number;
  };
  earningsByMonth: Array<{ month: string; earnings: number }>;
  appointmentsByDay: Array<{ day: string; count: number }>;
}

export default function ReportsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    yearlyEarnings: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    averageRating: 0,
    topServices: [],
    customerStats: {
      newCustomers: 0,
      returningCustomers: 0,
      totalCustomers: 0,
    },
    earningsByMonth: [],
    appointmentsByDay: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Simulated data - gerçek API entegrasyonu yapılacak
      const mockData: ReportData = {
        weeklyEarnings: 2500,
        monthlyEarnings: 12000,
        yearlyEarnings: 145000,
        totalAppointments: 45,
        completedAppointments: 42,
        averageRating: 4.8,
        topServices: [
          { name: 'Motor Revizyonu', count: 15, earnings: 4500 },
          { name: 'Fren Sistemi', count: 12, earnings: 3200 },
          { name: 'Klima Bakımı', count: 8, earnings: 1800 },
          { name: 'Elektrik Arızası', count: 6, earnings: 1200 },
          { name: 'Lastik Değişimi', count: 4, earnings: 800 },
        ],
        customerStats: {
          newCustomers: 8,
          returningCustomers: 34,
          totalCustomers: 42,
        },
        earningsByMonth: [
          { month: 'Ocak', earnings: 8500 },
          { month: 'Şubat', earnings: 9200 },
          { month: 'Mart', earnings: 11000 },
          { month: 'Nisan', earnings: 12000 },
          { month: 'Mayıs', earnings: 13500 },
          { month: 'Haziran', earnings: 12000 },
        ],
        appointmentsByDay: [
          { day: 'Pazartesi', count: 8 },
          { day: 'Salı', count: 6 },
          { day: 'Çarşamba', count: 7 },
          { day: 'Perşembe', count: 9 },
          { day: 'Cuma', count: 10 },
          { day: 'Cumartesi', count: 5 },
          { day: 'Pazar', count: 0 },
        ],
      };

      setReportData(mockData);

    } catch (error: any) {
      Alert.alert('Hata', 'Rapor verileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const getPeriodEarnings = () => {
    switch (selectedPeriod) {
      case 'week': return reportData.weeklyEarnings;
      case 'month': return reportData.monthlyEarnings;
      case 'year': return reportData.yearlyEarnings;
      default: return reportData.monthlyEarnings;
    }
  };

  const getPeriodText = () => {
    switch (selectedPeriod) {
      case 'week': return 'Haftalık';
      case 'month': return 'Aylık';
      case 'year': return 'Yıllık';
      default: return 'Aylık';
    }
  };

  const renderEarningsChart = () => {
    const maxEarnings = Math.max(...reportData.earningsByMonth.map(item => item.earnings));
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Aylık Kazanç Trendi</Text>
        <View style={styles.chart}>
          {reportData.earningsByMonth.map((item, index) => {
            const height = (item.earnings / maxEarnings) * 120;
            return (
              <View key={index} style={styles.chartBar}>
                <View 
                  style={[
                    styles.chartBarFill, 
                    { height: height }
                  ]} 
                />
                <Text style={styles.chartBarLabel}>{item.month}</Text>
                <Text style={styles.chartBarValue}>
                  {formatCurrency(item.earnings)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAppointmentsChart = () => {
    const maxCount = Math.max(...reportData.appointmentsByDay.map(item => item.count));
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Haftalık Randevu Dağılımı</Text>
        <View style={styles.chart}>
          {reportData.appointmentsByDay.map((item, index) => {
            const height = (item.count / maxCount) * 100;
            return (
              <View key={index} style={styles.chartBar}>
                <View 
                  style={[
                    styles.chartBarFillSecondary, 
                    { height: height }
                  ]} 
                />
                <Text style={styles.chartBarLabel}>{item.day}</Text>
                <Text style={styles.chartBarValue}>{item.count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="analytics" size={40} color={colors.primary.main} />
          <Text style={styles.loadingText}>Raporlar yükleniyor...</Text>
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
              <Text style={styles.headerTitle}>Raporlarım</Text>
            </View>
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
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity 
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'week' && styles.periodButtonTextActive]}>
              Hafta
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'month' && styles.periodButtonTextActive]}>
              Ay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('year')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'year' && styles.periodButtonTextActive]}>
              Yıl
            </Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Overview */}
        <View style={styles.earningsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Ionicons name="cash" size={24} color={colors.primary.main} />
              <Text style={styles.cardTitle}>{getPeriodText()} Kazanç</Text>
            </View>
            <TouchableOpacity 
              style={styles.detailButton}
              onPress={() => setShowEarningsModal(true)}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.earningsContent}>
            <Text style={styles.earningsAmount}>
              {formatCurrency(getPeriodEarnings())}
            </Text>
            <View style={styles.earningsStats}>
              <View style={styles.earningsStat}>
                <Text style={styles.earningsStatLabel}>Toplam Randevu</Text>
                <Text style={styles.earningsStatValue}>{reportData.totalAppointments}</Text>
              </View>
              <View style={styles.earningsStat}>
                <Text style={styles.earningsStatLabel}>Tamamlanan</Text>
                <Text style={styles.earningsStatValue}>{reportData.completedAppointments}</Text>
              </View>
              <View style={styles.earningsStat}>
                <Text style={styles.earningsStatLabel}>Ortalama Puan</Text>
                <Text style={styles.earningsStatValue}>{reportData.averageRating.toFixed(1)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top Services */}
        <View style={styles.servicesCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Ionicons name="construct" size={24} color={colors.primary.main} />
              <Text style={styles.cardTitle}>En Çok Yapılan Hizmetler</Text>
            </View>
            <TouchableOpacity 
              style={styles.detailButton}
              onPress={() => setShowServicesModal(true)}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.servicesList}>
            {reportData.topServices.slice(0, 3).map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceCount}>{service.count} işlem</Text>
                </View>
                <Text style={styles.serviceEarnings}>
                  {formatCurrency(service.earnings)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Customer Stats */}
        <View style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Ionicons name="people" size={24} color={colors.primary.main} />
              <Text style={styles.cardTitle}>Müşteri İstatistikleri</Text>
            </View>
          </View>
          
          <View style={styles.customerStats}>
            <View style={styles.customerStat}>
              <Text style={styles.customerStatValue}>{reportData.customerStats.totalCustomers}</Text>
              <Text style={styles.customerStatLabel}>Toplam Müşteri</Text>
            </View>
            <View style={styles.customerStat}>
              <Text style={styles.customerStatValue}>{reportData.customerStats.newCustomers}</Text>
              <Text style={styles.customerStatLabel}>Yeni Müşteri</Text>
            </View>
            <View style={styles.customerStat}>
              <Text style={styles.customerStatValue}>{reportData.customerStats.returningCustomers}</Text>
              <Text style={styles.customerStatLabel}>Tekrar Eden</Text>
            </View>
          </View>
        </View>

        {/* Charts */}
        {renderEarningsChart()}
        {renderAppointmentsChart()}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.endOfDayButton}
            onPress={() => navigation.navigate('EndOfDay' as never)}
          >
            <Ionicons name="today" size={20} color={colors.text.inverse} />
            <Text style={styles.endOfDayButtonText}>Günlük Rapor</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Earnings Detail Modal */}
      <Modal
        visible={showEarningsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detaylı Kazanç Raporu</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEarningsModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Haftalık Kazanç</Text>
              <Text style={styles.detailAmount}>{formatCurrency(reportData.weeklyEarnings)}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Aylık Kazanç</Text>
              <Text style={styles.detailAmount}>{formatCurrency(reportData.monthlyEarnings)}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Yıllık Kazanç</Text>
              <Text style={styles.detailAmount}>{formatCurrency(reportData.yearlyEarnings)}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Services Detail Modal */}
      <Modal
        visible={showServicesModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hizmet Detayları</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowServicesModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {reportData.topServices.map((service, index) => (
              <View key={index} style={styles.serviceDetailItem}>
                <View style={styles.serviceDetailInfo}>
                  <Text style={styles.serviceDetailName}>{service.name}</Text>
                  <Text style={styles.serviceDetailCount}>{service.count} işlem</Text>
                </View>
                <Text style={styles.serviceDetailEarnings}>
                  {formatCurrency(service.earnings)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
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

  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary.main,
  },
  periodButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  periodButtonTextActive: {
    color: colors.text.inverse,
  },

  // Cards
  earningsCard: {
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
  customerCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  detailButton: {
    padding: spacing.sm,
  },

  // Earnings
  earningsContent: {
    alignItems: 'center',
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.lg,
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  earningsStat: {
    alignItems: 'center',
  },
  earningsStatLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  earningsStatValue: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Services
  servicesList: {
    gap: spacing.md,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
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
  serviceCount: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  serviceEarnings: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  customerStatLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Charts
  chartContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  chartTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarFill: {
    width: 20,
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  chartBarFillSecondary: {
    width: 20,
    backgroundColor: colors.secondary.main,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  chartBarLabel: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  chartBarValue: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Modals
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
    borderBottomColor: colors.border.secondary,
  },
  modalTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  detailSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  detailSectionTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  detailAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.main,
  },
  serviceDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  serviceDetailInfo: {
    flex: 1,
  },
  serviceDetailName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  serviceDetailCount: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  serviceDetailEarnings: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
  },

  // Action Buttons
  actionButtons: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  endOfDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  endOfDayButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
