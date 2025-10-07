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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { typography, spacing, borderRadius, shadows, dimensions } from '@/shared/theme';
import apiService from '@/shared/services';

interface TireStorageItem {
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
  tireSet: {
    season: 'summer' | 'winter';
    brand: string;
    model: string;
    size: string;
    condition: 'new' | 'used' | 'good' | 'fair' | 'poor';
    treadDepth: number[];
    productionYear?: number;
    notes?: string;
  };
  location: {
    corridor: string;
    rack: number;
    slot: number;
    fullLocation: string;
  };
  barcode: string;
  qrCode: string;
  storageDate: string;
  expiryDate: string;
  status: 'stored' | 'retrieved' | 'expired' | 'damaged';
  storageFee: number;
  totalPaid: number;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  photos: string[];
  reminderSent: boolean;
  reminderDate?: string;
}

interface DepotStatus {
  layout: {
    corridors: Array<{
      name: string;
      racks: number;
      slotsPerRack: number;
      capacity: number;
    }>;
  };
  activeTireSets: TireStorageItem[];
  summary: {
    totalCapacity: number;
    occupiedSlots: number;
    availableSlots: number;
    occupancyRate: number;
  };
}

export default function TireHotelScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [depotStatus, setDepotStatus] = useState<DepotStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'storage' | 'retrieval'>('overview');
  
  // Modal states
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showRetrieveModal, setShowRetrieveModal] = useState(false);
  const [showDepotSetupModal, setShowDepotSetupModal] = useState(false);
  
  // Store form state
  const [storeForm, setStoreForm] = useState({
    customerId: '',
    vehicleId: '',
    season: 'summer' as 'summer' | 'winter',
    brand: '',
    model: '',
    size: '',
    condition: 'good' as 'new' | 'used' | 'good' | 'fair' | 'poor',
    treadDepth: [0, 0, 0, 0],
    productionYear: new Date().getFullYear(),
    notes: '',
    storageFee: 0
  });

  // Retrieve form state
  const [retrieveForm, setRetrieveForm] = useState({
    barcode: ''
  });

  useEffect(() => {
    fetchDepotStatus();
  }, []);

  const fetchDepotStatus = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTireDepotStatus();
      if (response.success) {
        setDepotStatus(response.data);
      } else {
        Alert.alert('Hata', 'Depo durumu yüklenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Depo durumu yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDepotStatus();
    setRefreshing(false);
  };

  const handleStoreTireSet = async () => {
    try {
      if (!storeForm.customerId || !storeForm.vehicleId || !storeForm.brand || !storeForm.model || !storeForm.size) {
        Alert.alert('Hata', 'Lütfen tüm gerekli alanları doldurun');
        return;
      }

      const response = await apiService.storeTireSet(storeForm);
      if (response.success) {
        Alert.alert('Başarılı', 'Lastik seti başarıyla depoya yerleştirildi');
        setShowStoreModal(false);
        resetStoreForm();
        await fetchDepotStatus();
      } else {
        Alert.alert('Hata', response.message || 'Lastik seti yerleştirilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Lastik seti yerleştirilirken bir hata oluştu');
    }
  };

  const handleRetrieveTireSet = async () => {
    try {
      if (!retrieveForm.barcode) {
        Alert.alert('Hata', 'Lütfen barkod girin');
        return;
      }

      const response = await apiService.findTireSetByBarcode(retrieveForm.barcode);
      if (response.success) {
        Alert.alert(
          'Lastik Seti Bulundu',
          `Müşteri: ${response.data.customerId.name} ${response.data.customerId.surname}\nAraç: ${response.data.vehicleId.brand} ${response.data.vehicleId.modelName}\nKonum: ${response.data.location.fullLocation}`,
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Teslim Et', onPress: () => confirmRetrieval(response.data._id) }
          ]
        );
      } else {
        Alert.alert('Hata', 'Lastik seti bulunamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Lastik seti aranırken bir hata oluştu');
    }
  };

  const confirmRetrieval = async (tireStorageId: string) => {
    try {
      const response = await apiService.retrieveTireSet(tireStorageId);
      if (response.success) {
        Alert.alert('Başarılı', 'Lastik seti başarıyla teslim edildi');
        setShowRetrieveModal(false);
        setRetrieveForm({ barcode: '' });
        await fetchDepotStatus();
      } else {
        Alert.alert('Hata', response.message || 'Lastik seti teslim edilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Lastik seti teslim edilirken bir hata oluştu');
    }
  };

  const resetStoreForm = () => {
    setStoreForm({
      customerId: '',
      vehicleId: '',
      season: 'summer',
      brand: '',
      model: '',
      size: '',
      condition: 'good',
      treadDepth: [0, 0, 0, 0],
      productionYear: new Date().getFullYear(),
      notes: '',
      storageFee: 0
    });
  };

  const getSeasonText = (season: string) => {
    return season === 'summer' ? 'Yazlık' : 'Kışlık';
  };

  const getConditionText = (condition: string) => {
    const conditions = {
      new: 'Yeni',
      used: 'İkinci El',
      good: 'İyi',
      fair: 'Orta',
      poor: 'Kötü'
    };
    return conditions[condition as keyof typeof conditions] || condition;
  };

  const getConditionColor = (condition: string) => {
    const colors = {
      new: '#4CAF50',
      used: '#FF9800',
      good: '#2196F3',
      fair: '#FF9800',
      poor: '#F44336'
    };
    return colors[condition as keyof typeof colors] || '#666';
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Depo Özeti */}
      <Card style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Depo Özeti</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{depotStatus?.summary.totalCapacity || 0}</Text>
            <Text style={styles.summaryLabel}>Toplam Kapasite</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{depotStatus?.summary.occupiedSlots || 0}</Text>
            <Text style={styles.summaryLabel}>Dolu Slot</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{depotStatus?.summary.availableSlots || 0}</Text>
            <Text style={styles.summaryLabel}>Boş Slot</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>%{Math.round(depotStatus?.summary.occupancyRate || 0)}</Text>
            <Text style={styles.summaryLabel}>Doluluk Oranı</Text>
          </View>
        </View>
      </Card>

      {/* Hızlı İşlemler */}
      <Card style={styles.quickActionsCard}>
        <Text style={styles.cardTitle}>Hızlı İşlemler</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => setShowStoreModal(true)}
          >
            <Ionicons name="add-circle" size={24} color={colors.primary.main} />
            <Text style={styles.quickActionText}>Lastik Yerleştir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => setShowRetrieveModal(true)}
          >
            <Ionicons name="search" size={24} color={colors.success.main} />
            <Text style={styles.quickActionText}>Lastik Bul</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => setShowDepotSetupModal(true)}
          >
            <Ionicons name="settings" size={24} color={colors.warning.main} />
            <Text style={styles.quickActionText}>Depo Ayarları</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => {
              Alert.alert(
                'Sezonluk Hatırlatma',
                'Hangi sezon için hatırlatma göndermek istiyorsunuz?',
                [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Yazlık', onPress: () => sendSeasonalReminder('summer') },
                  { text: 'Kışlık', onPress: () => sendSeasonalReminder('winter') }
                ]
              );
            }}
          >
            <Ionicons name="notifications" size={24} color={colors.info.main} />
            <Text style={styles.quickActionText}>Hatırlatma Gönder</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Aktif Lastik Setleri */}
      <Card style={styles.activeTireSetsCard}>
        <Text style={styles.cardTitle}>Aktif Lastik Setleri ({depotStatus?.activeTireSets.length || 0})</Text>
        <ScrollView style={styles.tireSetsList} showsVerticalScrollIndicator={false}>
          {depotStatus?.activeTireSets.map((tireSet) => (
            <View key={tireSet._id} style={styles.tireSetItem}>
              <View style={styles.tireSetHeader}>
                <Text style={styles.tireSetCustomer}>
                  {tireSet.customerId.name} {tireSet.customerId.surname}
                </Text>
                <View style={[styles.tireSetSeason, { backgroundColor: tireSet.tireSet.season === 'summer' ? colors.warning.light : colors.info.light }]}>
                  <Text style={styles.tireSetSeasonText}>
                    {getSeasonText(tireSet.tireSet.season)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.tireSetVehicle}>
                {tireSet.vehicleId.brand} {tireSet.vehicleId.modelName} - {tireSet.vehicleId.plateNumber}
              </Text>
              
              <Text style={styles.tireSetDetails}>
                {tireSet.tireSet.brand} {tireSet.tireSet.model} - {tireSet.tireSet.size}
              </Text>
              
              <View style={styles.tireSetFooter}>
                <Text style={styles.tireSetLocation}>
                  Konum: {tireSet.location.fullLocation}
                </Text>
                <View style={[styles.tireSetCondition, { backgroundColor: getConditionColor(tireSet.tireSet.condition) }]}>
                  <Text style={styles.tireSetConditionText}>
                    {getConditionText(tireSet.tireSet.condition)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </Card>
    </View>
  );

  const sendSeasonalReminder = async (season: 'summer' | 'winter') => {
    try {
      const response = await apiService.sendSeasonalReminders(season);
      if (response.success) {
        Alert.alert(
          'Başarılı',
          `${response.data.sentCount} adet ${season === 'summer' ? 'yazlık' : 'kışlık'} hatırlatma gönderildi.\nBaşarılı: ${response.data.successfulCount}\nBaşarısız: ${response.data.failedCount}`
        );
      } else {
        Alert.alert('Hata', response.message || 'Hatırlatma gönderilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Hatırlatma gönderilirken bir hata oluştu');
    }
  };

  const renderStoreModal = () => (
    <Modal
      visible={showStoreModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Lastik Seti Yerleştir</Text>
          <TouchableOpacity onPress={() => setShowStoreModal(false)}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Müşteri ID</Text>
            <TextInput
              style={styles.formInput}
              value={storeForm.customerId}
              onChangeText={(text) => setStoreForm(prev => ({ ...prev, customerId: text }))}
              placeholder="Müşteri ID girin"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Araç ID</Text>
            <TextInput
              style={styles.formInput}
              value={storeForm.vehicleId}
              onChangeText={(text) => setStoreForm(prev => ({ ...prev, vehicleId: text }))}
              placeholder="Araç ID girin"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Sezon</Text>
            <View style={styles.seasonSelector}>
              <TouchableOpacity
                style={[styles.seasonButton, storeForm.season === 'summer' && styles.seasonButtonActive]}
                onPress={() => setStoreForm(prev => ({ ...prev, season: 'summer' }))}
              >
                <Text style={[styles.seasonButtonText, storeForm.season === 'summer' && styles.seasonButtonTextActive]}>
                  Yazlık
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.seasonButton, storeForm.season === 'winter' && styles.seasonButtonActive]}
                onPress={() => setStoreForm(prev => ({ ...prev, season: 'winter' }))}
              >
                <Text style={[styles.seasonButtonText, storeForm.season === 'winter' && styles.seasonButtonTextActive]}>
                  Kışlık
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Marka</Text>
            <TextInput
              style={styles.formInput}
              value={storeForm.brand}
              onChangeText={(text) => setStoreForm(prev => ({ ...prev, brand: text }))}
              placeholder="Lastik markası"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Model</Text>
            <TextInput
              style={styles.formInput}
              value={storeForm.model}
              onChangeText={(text) => setStoreForm(prev => ({ ...prev, model: text }))}
              placeholder="Lastik modeli"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Ebat</Text>
            <TextInput
              style={styles.formInput}
              value={storeForm.size}
              onChangeText={(text) => setStoreForm(prev => ({ ...prev, size: text }))}
              placeholder="225/45/R17"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Durum</Text>
            <View style={styles.conditionSelector}>
              {['new', 'used', 'good', 'fair', 'poor'].map((condition) => (
                <TouchableOpacity
                  key={condition}
                  style={[styles.conditionButton, storeForm.condition === condition && styles.conditionButtonActive]}
                  onPress={() => setStoreForm(prev => ({ ...prev, condition: condition as any }))}
                >
                  <Text style={[styles.conditionButtonText, storeForm.condition === condition && styles.conditionButtonTextActive]}>
                    {getConditionText(condition)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Saklama Ücreti (₺)</Text>
            <TextInput
              style={styles.formInput}
              value={storeForm.storageFee.toString()}
              onChangeText={(text) => setStoreForm(prev => ({ ...prev, storageFee: parseFloat(text) || 0 }))}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Notlar</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={storeForm.notes}
              onChangeText={(text) => setStoreForm(prev => ({ ...prev, notes: text }))}
              placeholder="Ek notlar..."
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <Button
            title="İptal"
            onPress={() => setShowStoreModal(false)}
            style={[styles.modalButton, styles.cancelButton]}
            textStyle={styles.cancelButtonText}
          />
          <Button
            title="Yerleştir"
            onPress={handleStoreTireSet}
            style={[styles.modalButton, styles.confirmButton]}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderRetrieveModal = () => (
    <Modal
      visible={showRetrieveModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Lastik Seti Bul</Text>
          <TouchableOpacity onPress={() => setShowRetrieveModal(false)}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Barkod</Text>
            <TextInput
              style={styles.formInput}
              value={retrieveForm.barcode}
              onChangeText={(text) => setRetrieveForm(prev => ({ ...prev, barcode: text }))}
              placeholder="Barkod girin veya QR kod okutun"
              autoCapitalize="characters"
            />
          </View>
          
          <TouchableOpacity style={styles.qrScannerButton}>
            <Ionicons name="qr-code" size={24} color={colors.primary.main} />
            <Text style={styles.qrScannerText}>QR Kod Okut</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalFooter}>
          <Button
            title="İptal"
            onPress={() => setShowRetrieveModal(false)}
            style={[styles.modalButton, styles.cancelButton]}
            textStyle={styles.cancelButtonText}
          />
          <Button
            title="Ara"
            onPress={handleRetrieveTireSet}
            style={[styles.modalButton, styles.confirmButton]}
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
          <Text style={styles.loadingText}>Depo durumu yükleniyor...</Text>
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
        <Text style={styles.headerTitle}>Lastik Oteli</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'overview' && styles.tabButtonTextActive]}>
            Genel Bakış
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'storage' && styles.tabButtonActive]}
          onPress={() => setActiveTab('storage')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'storage' && styles.tabButtonTextActive]}>
            Yerleştirme
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'retrieval' && styles.tabButtonActive]}
          onPress={() => setActiveTab('retrieval')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'retrieval' && styles.tabButtonTextActive]}>
            Teslim
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
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'storage' && (
          <View style={styles.tabContent}>
            <Card style={styles.storageCard}>
              <Text style={styles.cardTitle}>Lastik Yerleştirme</Text>
              <Text style={styles.cardDescription}>
                Müşterinin lastik setini depoya yerleştirmek için gerekli bilgileri girin.
              </Text>
              <Button
                title="Yeni Lastik Seti Yerleştir"
                onPress={() => setShowStoreModal(true)}
                style={styles.primaryButton}
              />
            </Card>
          </View>
        )}
        {activeTab === 'retrieval' && (
          <View style={styles.tabContent}>
            <Card style={styles.retrievalCard}>
              <Text style={styles.cardTitle}>Lastik Teslim</Text>
              <Text style={styles.cardDescription}>
                Müşterinin lastik setini bulmak için barkod girin veya QR kod okutun.
              </Text>
              <Button
                title="Lastik Seti Bul"
                onPress={() => setShowRetrieveModal(true)}
                style={styles.primaryButton}
              />
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {renderStoreModal()}
      {renderRetrieveModal()}
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
    fontSize: typography.sizes.md,
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
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
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
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  tabButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: spacing.lg,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  cardDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary.main,
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  quickActionsCard: {
    marginBottom: spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  activeTireSetsCard: {
    marginBottom: spacing.lg,
  },
  tireSetsList: {
    maxHeight: 400,
  },
  tireSetItem: {
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  tireSetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tireSetCustomer: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  tireSetSeason: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tireSetSeasonText: {
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
  },
  tireSetVehicle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  tireSetDetails: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  tireSetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tireSetLocation: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  tireSetCondition: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tireSetConditionText: {
    fontSize: typography.sizes.xs,
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
  },
  storageCard: {
    alignItems: 'center',
  },
  retrievalCard: {
    alignItems: 'center',
  },
  primaryButton: {
    marginTop: spacing.md,
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
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  seasonSelector: {
    flexDirection: 'row',
  },
  seasonButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  seasonButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  seasonButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  seasonButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
  },
  conditionSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  conditionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  conditionButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  conditionButtonText: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  conditionButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
  },
  qrScannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderStyle: 'dashed',
  },
  qrScannerText: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    marginLeft: spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  cancelButtonText: {
    color: colors.text.secondary,
  },
  confirmButton: {
    backgroundColor: colors.primary.main,
  },
});
