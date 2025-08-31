import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/theme';
import { Customer, ServicedVehicle } from '../types/common';
import apiService from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components';

const { width } = Dimensions.get('window');

const CustomerManagementScreen = () => {
  const { user, token, isAuthenticated } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [servicedVehicles, setServicedVehicles] = useState<ServicedVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'customers' | 'vehicles'>('customers');
  
  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Form states
  const [noteForm, setNoteForm] = useState({
    content: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const [customersRes, vehiclesRes] = await Promise.all([
        apiService.getCustomerList(),
        apiService.getServicedVehicles(),
      ]);

      if (customersRes.success) setCustomers(customersRes.data || []);
      if (vehiclesRes.success) setServicedVehicles(vehiclesRes.data || []);
    } catch (error) {
      console.error('Veriler yüklenemedi:', error);
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAddNote = async () => {
    if (!selectedCustomer || !noteForm.content.trim()) {
      Alert.alert('Hata', 'Not içeriği gerekli');
      return;
    }

    try {
      const response = await apiService.addCustomerNote(selectedCustomer._id, {
        content: noteForm.content,
        mechanicId: user?._id,
      });

      if (response.success) {
        Alert.alert('Başarılı', 'Not eklendi');
        setShowNoteModal(false);
        setNoteForm({ content: '' });
        setSelectedCustomer(null);
        fetchData();
      }
    } catch (error: any) {
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    }
  };

  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <TouchableOpacity 
      style={styles.customerCard}
      onPress={() => {
        setSelectedCustomer(item);
        setShowNoteModal(true);
      }}
    >
      <View style={styles.customerHeader}>
        <View style={styles.customerAvatar}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0)}{item.surname.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {item.name} {item.surname}
          </Text>
          <Text style={styles.customerEmail}>{item.email}</Text>
          <Text style={styles.customerPhone}>{item.phone}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.customerStats}>
        <View style={styles.statItem}>
          <Ionicons name="car" size={16} color={colors.primary.main} />
          <Text style={styles.statText}>{item.vehicles.length} Araç</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="wallet" size={16} color={colors.success.main} />
          <Text style={styles.statText}>₺{item.totalSpent.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="calendar" size={16} color={colors.warning.main} />
          <Text style={styles.statText}>
            {new Date(item.lastVisit).toLocaleDateString('tr-TR')}
          </Text>
        </View>
      </View>
      
      {item.notes && item.notes.length > 0 && (
        <View style={styles.notesPreview}>
          <Text style={styles.notesLabel}>Son Not:</Text>
          <Text style={styles.notesText} numberOfLines={2}>
            {item.notes[item.notes.length - 1].content}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderVehicleCard = ({ item }: { item: ServicedVehicle }) => (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleIcon}>
          <Ionicons name="car-sport" size={24} color={colors.primary.main} />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>
            {item.brand} {item.model}
          </Text>
          <Text style={styles.vehiclePlate}>{item.plateNumber}</Text>
        </View>
        <View style={styles.vehicleStatus}>
          <Text style={styles.statusText}>Aktif</Text>
        </View>
      </View>
      
      <View style={styles.vehicleStats}>
        <View style={styles.vehicleStat}>
          <Text style={styles.statLabel}>Son Servis</Text>
          <Text style={styles.statValue}>
            {new Date(item.lastServiceDate).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <View style={styles.vehicleStat}>
          <Text style={styles.statLabel}>Toplam Servis</Text>
          <Text style={styles.statValue}>{item.totalServices}</Text>
        </View>
        <View style={styles.vehicleStat}>
          <Text style={styles.statLabel}>Toplam Harcama</Text>
          <Text style={styles.statValue}>₺{item.totalSpent.toLocaleString()}</Text>
        </View>
      </View>
      
      <View style={styles.vehicleFooter}>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>Detaylar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabButton = (tab: 'customers' | 'vehicles', label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={activeTab === tab ? colors.primary.main : colors.text.secondary} 
      />
      <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
        <View style={styles.loadingContainer}>
          <Ionicons name="people" size={48} color={colors.primary.main} />
          <Text style={styles.loadingText}>Müşteriler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Müşteri Yönetimi</Text>
            <Text style={styles.headerSubtitle}>Müşterilerinizi ve araçlarınızı yönetin</Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('customers', 'Müşteriler', 'people')}
        {renderTabButton('vehicles', 'Araçlar', 'car')}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="people" size={24} color={colors.primary.main} />
            </View>
            <Text style={styles.statNumber}>{customers.length}</Text>
            <Text style={styles.statLabel}>Toplam Müşteri</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="car" size={24} color={colors.success.main} />
            </View>
            <Text style={styles.statNumber}>{servicedVehicles.length}</Text>
            <Text style={styles.statLabel}>Servis Edilen Araç</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="trending-up" size={24} color={colors.warning.main} />
            </View>
            <Text style={styles.statNumber}>
              ₺{customers.reduce((total, customer) => total + customer.totalSpent, 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Toplam Gelir</Text>
          </View>
        </View>

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Müşteri Listesi</Text>
              <TouchableOpacity style={styles.addButton}>
                <Ionicons name="add" size={20} color={colors.text.inverse} />
                <Text style={styles.addButtonText}>Müşteri Ekle</Text>
              </TouchableOpacity>
            </View>
            
            {customers.length > 0 ? (
              <FlatList
                data={customers}
                renderItem={renderCustomerCard}
                keyExtractor={(item) => item._id}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyStateText}>Henüz müşteri eklenmemiş</Text>
                <Text style={styles.emptyStateSubtext}>İlk müşterinizi ekleyerek başlayın</Text>
              </View>
            )}
          </View>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Servis Edilen Araçlar</Text>
            </View>
            
            {servicedVehicles.length > 0 ? (
              <FlatList
                data={servicedVehicles}
                renderItem={renderVehicleCard}
                keyExtractor={(item) => item._id}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyStateText}>Henüz araç servis edilmemiş</Text>
                <Text style={styles.emptyStateSubtext}>İlk servisinizi yaparak başlayın</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Note Modal */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedCustomer ? `${selectedCustomer.name} ${selectedCustomer.surname}` : 'Müşteri'} - Not Ekle
              </Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Not içeriğini yazın..."
              value={noteForm.content}
              onChangeText={(text) => setNoteForm({ content: text })}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowNoteModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddNote}
              >
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
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
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  activeTabButton: {
    backgroundColor: colors.primary.ultraLight,
  },
  tabLabel: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.ultraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statNumber: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption.large,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  tabContent: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addButtonText: {
    ...typography.body2,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  customerCard: {
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customerAvatar: {
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.body1,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  customerEmail: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  customerPhone: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  moreButton: {
    padding: spacing.sm,
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.caption.large,
    color: colors.text.secondary,
  },
  notesPreview: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing.md,
  },
  notesLabel: {
    ...typography.caption.large,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  notesText: {
    ...typography.body2,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  vehicleCard: {
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  vehicleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary.ultraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  vehiclePlate: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  vehicleStatus: {
    backgroundColor: colors.success.ultraLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption.large,
    color: colors.success.main,
    fontWeight: '600',
  },
  vehicleStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  vehicleStat: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  vehicleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing.md,
  },
  viewButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  viewButtonText: {
    ...typography.body2,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.body1,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: width - spacing.xl * 2,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text.primary,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button.medium,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.button.medium,
    color: colors.text.inverse,
  },
});

export default CustomerManagementScreen;
