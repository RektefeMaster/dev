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
  TextInput,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

interface VehicleHistoryEntry {
  _id: string;
  vehicleId: string;
  serviceType: string;
  description: string;
  price: number;
  mileage: number;
  date: string;
}

interface MaintenanceReminder {
  _id: string;
  vehicleId: string;
  type: 'mileage' | 'date' | 'both';
  targetMileage?: number;
  targetDate?: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

interface Vehicle {
  _id: string;
  brand: string;
  modelName: string;
  year: number;
  plateNumber: string;
  color?: string;
}

export default function VehicleHistoryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  // Route params'ı güvenli şekilde al
  const routeParams = route.params as { 
    vehicleId?: string; 
    vehicle?: Vehicle;
  } | undefined;

  const vehicleId = routeParams?.vehicleId;
  const vehicle = routeParams?.vehicle;

  // Parametreler eksikse hata göster
  if (!vehicleId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.error.main} />
          <Text style={styles.errorTitle}>Hata</Text>
          <Text style={styles.errorMessage}>
            Araç bilgileri bulunamadı. Lütfen tekrar deneyin.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<VehicleHistoryEntry[]>([]);
  const [maintenanceReminders, setMaintenanceReminders] = useState<MaintenanceReminder[]>([]);
  const [showAddHistoryModal, setShowAddHistoryModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [showEditReminderModal, setShowEditReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<MaintenanceReminder | null>(null);

  // Form states
  const [historyForm, setHistoryForm] = useState({
    serviceType: '',
    description: '',
    price: '',
    mileage: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [reminderForm, setReminderForm] = useState({
    type: 'mileage' as 'mileage' | 'date' | 'both',
    targetMileage: '',
    targetDate: '',
    description: '',
  });

  const fetchVehicleHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await apiService.getVehicleHistory(vehicleId);
      
      if (response.success && response.data) {
        setHistoryEntries(response.data);
      } else {
        Alert.alert('Hata', response.message || 'Araç geçmişi yüklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Vehicle history fetch error:', error);
      Alert.alert('Hata', 'Araç geçmişi yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const fetchMaintenanceReminders = useCallback(async () => {
    try {
      const response = await apiService.getMaintenanceReminders(vehicleId);
      
      if (response.success && response.data) {
        setMaintenanceReminders(response.data);
      }
    } catch (error: any) {
      console.error('Maintenance reminders fetch error:', error);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleHistory();
      fetchMaintenanceReminders();
    }
  }, [vehicleId, fetchVehicleHistory, fetchMaintenanceReminders]);

  const onRefresh = async () => {
    if (!vehicleId) return;
    
    setRefreshing(true);
    await Promise.all([fetchVehicleHistory(), fetchMaintenanceReminders()]);
    setRefreshing(false);
  };

  const resetHistoryForm = () => {
    setHistoryForm({
      serviceType: '',
      description: '',
      price: '',
      mileage: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const resetReminderForm = () => {
    setReminderForm({
      type: 'mileage',
      targetMileage: '',
      targetDate: '',
      description: '',
    });
  };

  const openAddHistoryModal = () => {
    resetHistoryForm();
    setShowAddHistoryModal(true);
  };

  const openAddReminderModal = () => {
    resetReminderForm();
    setShowAddReminderModal(true);
  };

  const openEditReminderModal = (reminder: MaintenanceReminder) => {
    setReminderForm({
      type: reminder.type,
      targetMileage: reminder.targetMileage?.toString() || '',
      targetDate: reminder.targetDate ? new Date(reminder.targetDate).toISOString().split('T')[0] : '',
      description: reminder.description,
    });
    setEditingReminder(reminder);
    setShowEditReminderModal(true);
  };

  const handleAddHistoryEntry = async () => {
    if (!historyForm.serviceType.trim() || !historyForm.description.trim()) {
      Alert.alert('Hata', 'Hizmet türü ve açıklama gerekli.');
      return;
    }

    try {
      const historyData = {
        serviceType: historyForm.serviceType.trim(),
        description: historyForm.description.trim(),
        price: parseFloat(historyForm.price) || 0,
        mileage: parseInt(historyForm.mileage) || 0,
        date: historyForm.date,
      };

      const response = await apiService.addVehicleHistoryEntry(vehicleId, historyData);
      
      if (response.success) {
        await fetchVehicleHistory();
        setShowAddHistoryModal(false);
        resetHistoryForm();
        Alert.alert('Başarılı', 'Araç geçmişine kayıt eklendi.');
      } else {
        Alert.alert('Hata', response.message || 'Kayıt eklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Add history entry error:', error);
      Alert.alert('Hata', 'Kayıt eklenirken bir hata oluştu.');
    }
  };

  const handleAddReminder = async () => {
    if (!reminderForm.description.trim()) {
      Alert.alert('Hata', 'Açıklama gerekli.');
      return;
    }

    if (reminderForm.type === 'mileage' && !reminderForm.targetMileage.trim()) {
      Alert.alert('Hata', 'Hedef kilometre gerekli.');
      return;
    }

    if (reminderForm.type === 'date' && !reminderForm.targetDate.trim()) {
      Alert.alert('Hata', 'Hedef tarih gerekli.');
      return;
    }

    try {
      const reminderData = {
        type: reminderForm.type,
        targetMileage: reminderForm.targetMileage ? parseInt(reminderForm.targetMileage) : undefined,
        targetDate: reminderForm.targetDate || undefined,
        description: reminderForm.description.trim(),
      };

      const response = await apiService.addMaintenanceReminder(vehicleId, reminderData);
      
      if (response.success) {
        await fetchMaintenanceReminders();
        setShowAddReminderModal(false);
        resetReminderForm();
        Alert.alert('Başarılı', 'Bakım hatırlatması eklendi.');
      } else {
        Alert.alert('Hata', response.message || 'Hatırlatma eklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Add reminder error:', error);
      Alert.alert('Hata', 'Hatırlatma eklenirken bir hata oluştu.');
    }
  };

  const handleUpdateReminder = async () => {
    if (!editingReminder || !reminderForm.description.trim()) {
      Alert.alert('Hata', 'Açıklama gerekli.');
      return;
    }

    try {
      const updateData = {
        type: reminderForm.type,
        targetMileage: reminderForm.targetMileage ? parseInt(reminderForm.targetMileage) : undefined,
        targetDate: reminderForm.targetDate || undefined,
        description: reminderForm.description.trim(),
      };

      const response = await apiService.updateMaintenanceReminder(
        vehicleId, 
        editingReminder._id, 
        updateData
      );
      
      if (response.success) {
        await fetchMaintenanceReminders();
        setShowEditReminderModal(false);
        setEditingReminder(null);
        resetReminderForm();
        Alert.alert('Başarılı', 'Bakım hatırlatması güncellendi.');
      } else {
        Alert.alert('Hata', response.message || 'Hatırlatma güncellenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Update reminder error:', error);
      Alert.alert('Hata', 'Hatırlatma güncellenirken bir hata oluştu.');
    }
  };

  const handleDeleteReminder = async (reminder: MaintenanceReminder) => {
    Alert.alert(
      'Hatırlatma Sil',
      'Bu bakım hatırlatmasını silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteMaintenanceReminder(vehicleId, reminder._id);
              
              if (response.success) {
                await fetchMaintenanceReminders();
                Alert.alert('Başarılı', 'Bakım hatırlatması silindi.');
              } else {
                Alert.alert('Hata', response.message || 'Hatırlatma silinirken bir hata oluştu.');
              }
            } catch (error: any) {
              console.error('Delete reminder error:', error);
              Alert.alert('Hata', 'Hatırlatma silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat('tr-TR').format(mileage) + ' km';
  };

  const getReminderTypeText = (type: string) => {
    switch (type) {
      case 'mileage': return 'Kilometre';
      case 'date': return 'Tarih';
      case 'both': return 'Kilometre + Tarih';
      default: return type;
    }
  };

  const renderHistoryItem = ({ item }: { item: VehicleHistoryEntry }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyServiceType}>{item.serviceType}</Text>
        <Text style={styles.historyPrice}>{formatCurrency(item.price)}</Text>
      </View>
      <Text style={styles.historyDescription}>{item.description}</Text>
      <View style={styles.historyDetails}>
        <View style={styles.historyDetail}>
          <Ionicons name="speedometer" size={16} color={colors.text.secondary} />
          <Text style={styles.historyDetailText}>{formatMileage(item.mileage)}</Text>
        </View>
        <View style={styles.historyDetail}>
          <Ionicons name="calendar" size={16} color={colors.text.secondary} />
          <Text style={styles.historyDetailText}>{formatDate(item.date)}</Text>
        </View>
      </View>
    </View>
  );

  const renderReminderItem = ({ item }: { item: MaintenanceReminder }) => (
    <View style={styles.reminderItem}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderTypeContainer}>
          <Text style={styles.reminderType}>{getReminderTypeText(item.type)}</Text>
          {!item.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveText}>Pasif</Text>
            </View>
          )}
        </View>
        <View style={styles.reminderActions}>
          <TouchableOpacity 
            style={styles.reminderActionButton}
            onPress={() => openEditReminderModal(item)}
          >
            <Ionicons name="create" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.reminderActionButton}
            onPress={() => handleDeleteReminder(item)}
          >
            <Ionicons name="trash" size={16} color={colors.error.main} />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.reminderDescription}>{item.description}</Text>
      
      <View style={styles.reminderDetails}>
        {item.targetMileage && (
          <View style={styles.reminderDetail}>
            <Ionicons name="speedometer" size={16} color={colors.text.secondary} />
            <Text style={styles.reminderDetailText}>
              Hedef: {formatMileage(item.targetMileage)}
            </Text>
          </View>
        )}
        {item.targetDate && (
          <View style={styles.reminderDetail}>
            <Ionicons name="calendar" size={16} color={colors.text.secondary} />
            <Text style={styles.reminderDetailText}>
              Hedef: {formatDate(item.targetDate)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="car" size={40} color={colors.primary.main} />
          <Text style={styles.loadingText}>Araç geçmişi yükleniyor...</Text>
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
              <Text style={styles.headerTitle}>Araç Geçmişi</Text>
              <Text style={styles.headerSubtitle}>
                {vehicle.brand} {vehicle.modelName} ({vehicle.year})
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Vehicle Info */}
        <View style={styles.vehicleInfoCard}>
          <View style={styles.vehicleInfoHeader}>
            <Ionicons name="car" size={24} color={colors.primary.main} />
            <Text style={styles.vehicleInfoTitle}>Araç Bilgileri</Text>
          </View>
          <View style={styles.vehicleInfoDetails}>
            <Text style={styles.vehicleInfoText}>
              {vehicle.brand} {vehicle.modelName} ({vehicle.year})
            </Text>
            <Text style={styles.vehicleInfoText}>Plaka: {vehicle.plateNumber}</Text>
            {vehicle.color && <Text style={styles.vehicleInfoText}>Renk: {vehicle.color}</Text>}
          </View>
        </View>

        {/* History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Servis Geçmişi</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={openAddHistoryModal}
            >
              <Ionicons name="add" size={20} color={colors.primary.main} />
            </TouchableOpacity>
          </View>
          
          {historyEntries.length > 0 ? (
            <FlatList
              data={historyEntries}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyStateText}>Henüz servis kaydı yok</Text>
            </View>
          )}
        </View>

        {/* Maintenance Reminders Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bakım Hatırlatmaları</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={openAddReminderModal}
            >
              <Ionicons name="add" size={20} color={colors.primary.main} />
            </TouchableOpacity>
          </View>
          
          {maintenanceReminders.length > 0 ? (
            <FlatList
              data={maintenanceReminders}
              renderItem={renderReminderItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="alarm-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyStateText}>Henüz bakım hatırlatması yok</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add History Modal */}
      <Modal
        visible={showAddHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Servis Kaydı Ekle</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAddHistoryModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Hizmet Türü *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Örn: Motor Yağı Değişimi"
                value={historyForm.serviceType}
                onChangeText={(text) => setHistoryForm(prev => ({ ...prev, serviceType: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Açıklama *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Yapılan işlemlerin detayı"
                value={historyForm.description}
                onChangeText={(text) => setHistoryForm(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Fiyat (₺)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0"
                value={historyForm.price}
                onChangeText={(text) => setHistoryForm(prev => ({ ...prev, price: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Kilometre</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0"
                value={historyForm.mileage}
                onChangeText={(text) => setHistoryForm(prev => ({ ...prev, mileage: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tarih</Text>
              <TextInput
                style={styles.formInput}
                value={historyForm.date}
                onChangeText={(text) => setHistoryForm(prev => ({ ...prev, date: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleAddHistoryEntry}
            >
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Reminder Modal */}
      <Modal
        visible={showAddReminderModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bakım Hatırlatması Ekle</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAddReminderModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Hatırlatma Türü</Text>
              <View style={styles.typeButtons}>
                {['mileage', 'date', 'both'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      reminderForm.type === type && styles.typeButtonSelected
                    ]}
                    onPress={() => setReminderForm(prev => ({ ...prev, type: type as any }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      reminderForm.type === type && styles.typeButtonTextSelected
                    ]}>
                      {getReminderTypeText(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {reminderForm.type === 'mileage' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hedef Kilometre</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="50000"
                  value={reminderForm.targetMileage}
                  onChangeText={(text) => setReminderForm(prev => ({ ...prev, targetMileage: text }))}
                  keyboardType="numeric"
                />
              </View>
            )}

            {reminderForm.type === 'date' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hedef Tarih</Text>
                <TextInput
                  style={styles.formInput}
                  value={reminderForm.targetDate}
                  onChangeText={(text) => setReminderForm(prev => ({ ...prev, targetDate: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            )}

            {reminderForm.type === 'both' && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Hedef Kilometre</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="50000"
                    value={reminderForm.targetMileage}
                    onChangeText={(text) => setReminderForm(prev => ({ ...prev, targetMileage: text }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Hedef Tarih</Text>
                  <TextInput
                    style={styles.formInput}
                    value={reminderForm.targetDate}
                    onChangeText={(text) => setReminderForm(prev => ({ ...prev, targetDate: text }))}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Açıklama *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Bakım hatırlatması açıklaması"
                value={reminderForm.description}
                onChangeText={(text) => setReminderForm(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleAddReminder}
            >
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Reminder Modal */}
      <Modal
        visible={showEditReminderModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bakım Hatırlatması Düzenle</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEditReminderModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Hatırlatma Türü</Text>
              <View style={styles.typeButtons}>
                {['mileage', 'date', 'both'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      reminderForm.type === type && styles.typeButtonSelected
                    ]}
                    onPress={() => setReminderForm(prev => ({ ...prev, type: type as any }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      reminderForm.type === type && styles.typeButtonTextSelected
                    ]}>
                      {getReminderTypeText(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {reminderForm.type === 'mileage' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hedef Kilometre</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="50000"
                  value={reminderForm.targetMileage}
                  onChangeText={(text) => setReminderForm(prev => ({ ...prev, targetMileage: text }))}
                  keyboardType="numeric"
                />
              </View>
            )}

            {reminderForm.type === 'date' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hedef Tarih</Text>
                <TextInput
                  style={styles.formInput}
                  value={reminderForm.targetDate}
                  onChangeText={(text) => setReminderForm(prev => ({ ...prev, targetDate: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            )}

            {reminderForm.type === 'both' && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Hedef Kilometre</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="50000"
                    value={reminderForm.targetMileage}
                    onChangeText={(text) => setReminderForm(prev => ({ ...prev, targetMileage: text }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Hedef Tarih</Text>
                  <TextInput
                    style={styles.formInput}
                    value={reminderForm.targetDate}
                    onChangeText={(text) => setReminderForm(prev => ({ ...prev, targetDate: text }))}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Açıklama *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Bakım hatırlatması açıklaması"
                value={reminderForm.description}
                onChangeText={(text) => setReminderForm(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleUpdateReminder}
            >
              <Text style={styles.saveButtonText}>Güncelle</Text>
            </TouchableOpacity>
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
  headerSubtitle: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
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

  // Vehicle Info
  vehicleInfoCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.md,
    ...shadows.small,
  },
  vehicleInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  vehicleInfoTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  vehicleInfoDetails: {
    gap: spacing.xs,
  },
  vehicleInfoText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  addButton: {
    padding: spacing.sm,
  },

  // History Items
  historyItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyServiceType: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  historyPrice: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
  },
  historyDescription: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  historyDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  historyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyDetailText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },

  // Reminder Items
  reminderItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reminderTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reminderType: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  inactiveBadge: {
    backgroundColor: colors.text.tertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  inactiveText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.inverse,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reminderActionButton: {
    padding: spacing.sm,
  },
  reminderDescription: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  reminderDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  reminderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reminderDetailText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },

  // Modal
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

  // Form
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary.main,
  },
  typeButtonText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  typeButtonTextSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  // Error container styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.error.main,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeights.semibold,
  },
});
