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
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

interface Supplier {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  specialties: string[];
  notes?: string;
  createdAt: string;
}

export default function SuppliersScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    specialties: [] as string[],
    notes: '',
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await apiService.getSuppliers(searchQuery, selectedSpecialty);
      
      if (response.success && response.data) {
        setSuppliers(response.data);
        setFilteredSuppliers(response.data);
      } else {
        Alert.alert('Hata', response.message || 'Tedarikçi verileri yüklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Suppliers fetch error:', error);
      Alert.alert('Hata', 'Tedarikçi verileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSpecialty]);

  const fetchSpecialties = useCallback(async () => {
    try {
      const response = await apiService.getSupplierSpecialties();
      
      if (response.success && response.data) {
        setSpecialties(response.data);
      }
    } catch (error: any) {
      console.error('Specialties fetch error:', error);
    }
  }, []);

  // Arama için debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchSuppliers();
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [searchQuery, selectedSpecialty, fetchSuppliers]);

  useEffect(() => {
    fetchSuppliers();
    fetchSpecialties();
  }, [fetchSuppliers, fetchSpecialties]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSuppliers();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      specialties: [],
      notes: '',
    });
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      specialties: supplier.specialties,
      notes: supplier.notes || '',
    });
    setEditingSupplier(supplier);
    setShowEditModal(true);
  };

  const handleAddSupplier = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      Alert.alert('Hata', 'Tedarikçi adı ve telefon numarası gerekli.');
      return;
    }

    try {
      const response = await apiService.addSupplier(formData);
      
      if (response.success) {
        await fetchSuppliers();
        setShowAddModal(false);
        resetForm();
        Alert.alert('Başarılı', 'Tedarikçi başarıyla eklendi.');
      } else {
        Alert.alert('Hata', response.message || 'Tedarikçi eklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Add supplier error:', error);
      Alert.alert('Hata', 'Tedarikçi eklenirken bir hata oluştu.');
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier || !formData.name.trim() || !formData.phone.trim()) {
      Alert.alert('Hata', 'Tedarikçi adı ve telefon numarası gerekli.');
      return;
    }

    try {
      const response = await apiService.updateSupplier(editingSupplier._id, formData);
      
      if (response.success) {
        await fetchSuppliers();
        setShowEditModal(false);
        setEditingSupplier(null);
        resetForm();
        Alert.alert('Başarılı', 'Tedarikçi başarıyla güncellendi.');
      } else {
        Alert.alert('Hata', response.message || 'Tedarikçi güncellenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Update supplier error:', error);
      Alert.alert('Hata', 'Tedarikçi güncellenirken bir hata oluştu.');
    }
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    Alert.alert(
      'Tedarikçi Sil',
      `${supplier.name} tedarikçisini silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteSupplier(supplier._id);
              
              if (response.success) {
                await fetchSuppliers();
                Alert.alert('Başarılı', 'Tedarikçi başarıyla silindi.');
              } else {
                Alert.alert('Hata', response.message || 'Tedarikçi silinirken bir hata oluştu.');
              }
            } catch (error: any) {
              console.error('Delete supplier error:', error);
              Alert.alert('Hata', 'Tedarikçi silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const renderSupplierItem = ({ item }: { item: Supplier }) => (
    <View style={styles.supplierItem}>
      <View style={styles.supplierHeader}>
        <View style={styles.supplierInfo}>
          <Text style={styles.supplierName}>{item.name}</Text>
          <Text style={styles.supplierPhone}>{item.phone}</Text>
          {item.email && <Text style={styles.supplierEmail}>{item.email}</Text>}
          {item.address && <Text style={styles.supplierAddress}>{item.address}</Text>}
        </View>
        
        <View style={styles.supplierActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleCall(item.phone)}
          >
            <Ionicons name="call" size={20} color={colors.primary.main} />
          </TouchableOpacity>
          
          {item.email && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleEmail(item.email!)}
            >
              <Ionicons name="mail" size={20} color={colors.primary.main} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteSupplier(item)}
          >
            <Ionicons name="trash" size={20} color={colors.error.main} />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.specialties.length > 0 && (
        <View style={styles.specialtiesContainer}>
          {item.specialties.map((specialty, index) => (
            <View key={index} style={styles.specialtyTag}>
              <Text style={styles.specialtyText}>{specialty}</Text>
            </View>
          ))}
        </View>
      )}
      
      {item.notes && (
        <Text style={styles.supplierNotes}>{item.notes}</Text>
      )}
    </View>
  );

  const renderSpecialtyFilter = (specialty: string) => (
    <TouchableOpacity 
      key={specialty}
      style={[
        styles.filterButton,
        selectedSpecialty === specialty && styles.filterButtonActive
      ]}
      onPress={() => setSelectedSpecialty(
        selectedSpecialty === specialty ? '' : specialty
      )}
    >
      <Text style={[
        styles.filterButtonText,
        selectedSpecialty === specialty && styles.filterButtonTextActive
      ]}>
        {specialty}
      </Text>
    </TouchableOpacity>
  );

  const renderSpecialtyOption = (specialty: string) => (
    <TouchableOpacity 
      key={specialty}
      style={[
        styles.specialtyOption,
        formData.specialties.includes(specialty) && styles.specialtyOptionSelected
      ]}
      onPress={() => toggleSpecialty(specialty)}
    >
      <Text style={[
        styles.specialtyOptionText,
        formData.specialties.includes(specialty) && styles.specialtyOptionTextSelected
      ]}>
        {specialty}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="business" size={40} color={colors.primary.main} />
          <Text style={styles.loadingText}>Tedarikçiler yükleniyor...</Text>
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
              <Text style={styles.headerTitle}>Parçacılar Rehberi</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={openAddModal}
          >
            <Ionicons name="add" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tedarikçi ara..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Specialty Filters */}
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersLabel}>Uzmanlık:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            <TouchableOpacity 
              style={[
                styles.filterButton,
                selectedSpecialty === '' && styles.filterButtonActive
              ]}
              onPress={() => setSelectedSpecialty('')}
            >
              <Text style={[
                styles.filterButtonText,
                selectedSpecialty === '' && styles.filterButtonTextActive
              ]}>
                Tümü
              </Text>
            </TouchableOpacity>
            {specialties.map(renderSpecialtyFilter)}
          </ScrollView>
        </View>

        {/* Suppliers List */}
        <FlatList
          data={filteredSuppliers}
          renderItem={renderSupplierItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary.main]}
              tintColor={colors.primary.main}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={64} color={colors.text.tertiary} />
              <Text style={styles.emptyStateTitle}>Tedarikçi bulunamadı</Text>
              <Text style={styles.emptyStateSubtitle}>
                {searchQuery || selectedSpecialty ? 'Arama kriterlerinize uygun tedarikçi bulunamadı.' : 'Henüz tedarikçi eklenmemiş.'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Add Supplier Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni Tedarikçi</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAddModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tedarikçi Adı *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Tedarikçi adı girin"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Telefon *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Telefon numarası girin"
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>E-posta</Text>
              <TextInput
                style={styles.formInput}
                placeholder="E-posta adresi girin"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Adres</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Adres girin"
                value={formData.address}
                onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Uzmanlık Alanları</Text>
              <View style={styles.specialtiesGrid}>
                {specialties.map(renderSpecialtyOption)}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notlar</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Notlar girin"
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleAddSupplier}
            >
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tedarikçi Düzenle</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEditModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tedarikçi Adı *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Tedarikçi adı girin"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Telefon *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Telefon numarası girin"
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>E-posta</Text>
              <TextInput
                style={styles.formInput}
                placeholder="E-posta adresi girin"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Adres</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Adres girin"
                value={formData.address}
                onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Uzmanlık Alanları</Text>
              <View style={styles.specialtiesGrid}>
                {specialties.map(renderSpecialtyOption)}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notlar</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Notlar girin"
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleUpdateSupplier}
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
  addButton: {
    padding: spacing.sm,
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

  // Search
  searchContainer: {
    paddingVertical: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
  },

  // Filters
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  filtersScroll: {
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.ultraLight,
  },
  filterButtonText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  filterButtonTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },

  // Supplier List
  listContent: {
    paddingBottom: spacing.xl,
  },
  supplierItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  supplierPhone: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  supplierEmail: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  supplierAddress: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
  },
  supplierActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  specialtyTag: {
    backgroundColor: colors.primary.ultraLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  specialtyText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.primary.main,
  },
  supplierNotes: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
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
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  specialtyOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  specialtyOptionSelected: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary.main,
  },
  specialtyOptionText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  specialtyOptionTextSelected: {
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
});
