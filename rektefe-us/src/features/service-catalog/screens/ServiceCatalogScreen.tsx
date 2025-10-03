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
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton, LoadingSpinner } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

interface ServiceItem {
  _id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
  createdAt: string;
}

const SERVICE_CATEGORIES = [
  'Motor Bakımı',
  'Fren Sistemi',
  'Süspansiyon',
  'Elektrik',
  'Klima',
  'Lastik',
  'Egzoz',
  'Kaportaj',
  'Boyama',
  'Genel Bakım',
  'Diğer'
];

export default function ServiceCatalogScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [serviceActive, setServiceActive] = useState(true);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getServiceCatalog(searchQuery, selectedCategory || undefined);

      if (response.success && response.data) {
        setServices(response.data);
      } else {
        Alert.alert('Hata', response.message || 'Hizmet kataloğu yüklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Service catalog fetch error:', error);
      Alert.alert('Hata', 'Hizmet kataloğu yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  };

  const handleAddEditService = async () => {
    if (!serviceName.trim() || !serviceCategory.trim() || !servicePrice.trim() || !serviceDuration.trim()) {
      Alert.alert('Hata', 'Tüm zorunlu alanları doldurunuz.');
      return;
    }

    const serviceData = {
      name: serviceName.trim(),
      category: serviceCategory.trim(),
      description: serviceDescription.trim() || undefined,
      price: parseFloat(servicePrice),
      duration: parseInt(serviceDuration),
      isActive: serviceActive,
    };

    try {
      let response;
      if (editingService) {
        response = await apiService.updateServiceCatalogItem(editingService._id, serviceData);
      } else {
        response = await apiService.addServiceCatalogItem(serviceData);
      }

      if (response.success) {
        Alert.alert('Başarılı', editingService ? 'Hizmet başarıyla güncellendi.' : 'Hizmet başarıyla eklendi.');
        setShowAddEditModal(false);
        resetForm();
        fetchServices();
      } else {
        Alert.alert('Hata', response.message || 'Hizmet işlemi sırasında bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Add/Edit service error:', error);
      Alert.alert('Hata', 'Hizmet işlemi sırasında bir hata oluştu.');
    }
  };

  const handleDeleteService = (serviceId: string) => {
    Alert.alert(
      'Hizmeti Sil',
      'Bu hizmeti silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteServiceCatalogItem(serviceId);
              if (response.success) {
                Alert.alert('Başarılı', 'Hizmet başarıyla silindi.');
                fetchServices();
              } else {
                Alert.alert('Hata', response.message || 'Hizmet silinirken bir hata oluştu.');
              }
            } catch (error: any) {
              console.error('Delete service error:', error);
              Alert.alert('Hata', 'Hizmet silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const openAddModal = () => {
    setEditingService(null);
    resetForm();
    setShowAddEditModal(true);
  };

  const openEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceCategory(service.category);
    setServiceDescription(service.description);
    setServicePrice(service.price.toString());
    setServiceDuration(service.duration.toString());
    setServiceActive(service.isActive);
    setShowAddEditModal(true);
  };

  const resetForm = () => {
    setServiceName('');
    setServiceCategory('');
    setServiceDescription('');
    setServicePrice('');
    setServiceDuration('');
    setServiceActive(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} dk`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}s ${remainingMinutes}dk` : `${hours}s`;
    }
  };

  const renderServiceItem = ({ item }: { item: ServiceItem }) => (
    <View style={styles.serviceItem}>
      <View style={styles.serviceInfo}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <View style={styles.serviceStatus}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: item.isActive ? colors.success.main : colors.error.main }
            ]} />
            <Text style={[
              styles.statusText,
              { color: item.isActive ? colors.success.main : colors.error.main }
            ]}>
              {item.isActive ? 'Aktif' : 'Pasif'}
            </Text>
          </View>
        </View>
        <Text style={styles.serviceCategory}>{item.category}</Text>
        {item.description && <Text style={styles.serviceDescription}>{item.description}</Text>}
        <View style={styles.serviceDetails}>
          <Text style={styles.servicePrice}>{formatCurrency(item.price)}</Text>
          <Text style={styles.serviceDuration}>{formatDuration(item.duration)}</Text>
        </View>
      </View>
      <View style={styles.serviceActions}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
          <Ionicons name="create" size={20} color={colors.info.main} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteService(item._id)} style={styles.actionButton}>
          <Ionicons name="trash" size={20} color={colors.error.main} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Hizmet kataloğu yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background.primary} />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <BackButton />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Hizmet Kataloğu</Text>
            </View>
          </View>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add-circle" size={30} color={colors.primary.main} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Hizmet ara..."
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity
              style={[styles.categoryButton, !selectedCategory && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.categoryButtonText, !selectedCategory && styles.categoryButtonTextActive]}>
                Tümü
              </Text>
            </TouchableOpacity>
            {SERVICE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.categoryButtonText, selectedCategory === category && styles.categoryButtonTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={services}
          renderItem={renderServiceItem}
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
              <Ionicons name="list-outline" size={64} color={colors.text.tertiary} />
              <Text style={styles.emptyStateTitle}>Hizmet bulunamadı</Text>
              <Text style={styles.emptyStateSubtitle}>
                {searchQuery || selectedCategory ? 'Arama kriterlerinize uygun hizmet bulunamadı.' : 'Henüz hizmet eklenmemiş.'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Add/Edit Service Modal */}
      <Modal
        visible={showAddEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddEditModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}</Text>
            <TouchableOpacity onPress={() => setShowAddEditModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Hizmet Adı"
              placeholderTextColor={colors.text.tertiary}
              value={serviceName}
              onChangeText={setServiceName}
            />
            
            <View style={styles.categoryInputContainer}>
              <Text style={styles.categoryInputLabel}>Kategori:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryInputScroll}>
                {SERVICE_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryInputButton,
                      serviceCategory === category && styles.categoryInputButtonActive
                    ]}
                    onPress={() => setServiceCategory(category)}
                  >
                    <Text style={[
                      styles.categoryInputButtonText,
                      serviceCategory === category && styles.categoryInputButtonTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Açıklama (İsteğe Bağlı)"
              placeholderTextColor={colors.text.tertiary}
              value={serviceDescription}
              onChangeText={setServiceDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Fiyat (TL)"
              placeholderTextColor={colors.text.tertiary}
              value={servicePrice}
              onChangeText={setServicePrice}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Süre (Dakika)"
              placeholderTextColor={colors.text.tertiary}
              value={serviceDuration}
              onChangeText={setServiceDuration}
              keyboardType="numeric"
            />

            <View style={styles.activeToggleContainer}>
              <Text style={styles.activeToggleLabel}>Aktif:</Text>
              <TouchableOpacity
                style={[styles.activeToggle, serviceActive && styles.activeToggleActive]}
                onPress={() => setServiceActive(!serviceActive)}
              >
                <View style={[styles.activeToggleButton, serviceActive && styles.activeToggleButtonActive]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (!serviceName.trim() || !serviceCategory.trim() || !servicePrice.trim() || !serviceDuration.trim()) && styles.saveButtonDisabled]}
              onPress={handleAddEditService}
              disabled={!serviceName.trim() || !serviceCategory.trim() || !servicePrice.trim() || !serviceDuration.trim()}
            >
              <Text style={styles.saveButtonText}>{editingService ? 'Güncelle' : 'Ekle'}</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
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
    color: colors.text.primary,
  },
  addButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  searchFilterContainer: {
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
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
  },
  categoryScroll: {
    maxHeight: 40,
  },
  categoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary.main,
  },
  categoryButtonText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  categoryButtonTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  serviceItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  serviceName: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  serviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.round,
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '500',
  },
  serviceCategory: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  serviceDescription: {
    fontSize: typography.body3.fontSize,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.success.main,
  },
  serviceDuration: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
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
    minHeight: 100,
  },
  categoryInputContainer: {
    marginBottom: spacing.md,
  },
  categoryInputLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  categoryInputScroll: {
    maxHeight: 40,
  },
  categoryInputButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
  },
  categoryInputButtonActive: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary.main,
  },
  categoryInputButtonText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  categoryInputButtonTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  activeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  activeToggleLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  activeToggle: {
    width: 50,
    height: 30,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  activeToggleActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  activeToggleButton: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.round,
    backgroundColor: colors.text.tertiary,
    alignSelf: 'flex-start',
  },
  activeToggleButtonActive: {
    backgroundColor: colors.text.inverse,
    alignSelf: 'flex-end',
  },
  saveButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  saveButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
