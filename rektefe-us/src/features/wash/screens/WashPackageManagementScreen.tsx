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
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, shadows, typography } from '@/shared/theme';
import apiService from '@/shared/services';

interface WashPackage {
  _id: string;
  name: string;
  description: string;
  packageType: 'quick_exterior' | 'standard' | 'detailed_interior' | 'ceramic_protection' | 'engine' | 'custom';
  basePrice: number;
  duration: number;
  services: Array<{
    name: string;
    category: 'exterior' | 'interior' | 'engine' | 'special';
    order: number;
  }>;
  extras: Array<{
    name: string;
    description: string;
    price: number;
    duration: number;
  }>;
  availableFor: 'shop' | 'mobile' | 'both';
  requirements: {
    requiresPower: boolean;
    requiresWater: boolean;
    requiresCoveredArea: boolean;
  };
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: string;
}

interface ServiceItem {
  name: string;
  category: 'exterior' | 'interior' | 'engine' | 'special';
  order: number;
}

interface ExtraItem {
  name: string;
  description: string;
  price: number;
  duration: number;
}

export default function WashPackageManagementScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [packages, setPackages] = useState<WashPackage[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<WashPackage | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    packageType: 'standard' as 'quick_exterior' | 'standard' | 'detailed_interior' | 'ceramic_protection' | 'engine' | 'custom',
    basePrice: '',
    duration: '',
    availableFor: 'both' as 'shop' | 'mobile' | 'both',
    requiresPower: false,
    requiresWater: true,
    requiresCoveredArea: false,
  });

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [extras, setExtras] = useState<ExtraItem[]>([]);

  // Servis ekleme modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'exterior' as 'exterior' | 'interior' | 'engine' | 'special',
  });

  // Ekstra ekleme modal
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraForm, setExtraForm] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await apiService.CarWashService.getMyWashPackages();
      
      if (response.success && response.data) {
        setPackages(response.data);
      }
    } catch (error) {
      console.error('Paketler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPackages();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      packageType: 'standard',
      basePrice: '',
      duration: '',
      availableFor: 'both',
      requiresPower: false,
      requiresWater: true,
      requiresCoveredArea: false,
    });
    setServices([]);
    setExtras([]);
    setEditingPackage(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (pkg: WashPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      packageType: pkg.packageType,
      basePrice: pkg.basePrice.toString(),
      duration: pkg.duration.toString(),
      availableFor: pkg.availableFor,
      requiresPower: pkg.requirements.requiresPower,
      requiresWater: pkg.requirements.requiresWater,
      requiresCoveredArea: pkg.requirements.requiresCoveredArea,
    });
    setServices(pkg.services || []);
    setExtras(pkg.extras || []);
    setShowCreateModal(true);
  };

  const handleAddService = () => {
    if (!serviceForm.name.trim()) {
      Alert.alert('Uyarı', 'Hizmet adı giriniz');
      return;
    }

    const newService: ServiceItem = {
      name: serviceForm.name,
      category: serviceForm.category,
      order: services.length + 1,
    };

    setServices([...services, newService]);
    setServiceForm({ name: '', category: 'exterior' });
    setShowServiceModal(false);
  };

  const handleRemoveService = (index: number) => {
    const updatedServices = services.filter((_, i) => i !== index);
    // Sıralamayı yeniden düzenle
    const reorderedServices = updatedServices.map((s, i) => ({
      ...s,
      order: i + 1,
    }));
    setServices(reorderedServices);
  };

  const handleAddExtra = () => {
    if (!extraForm.name.trim() || !extraForm.price || !extraForm.duration) {
      Alert.alert('Uyarı', 'Tüm alanları doldurunuz');
      return;
    }

    const newExtra: ExtraItem = {
      name: extraForm.name,
      description: extraForm.description,
      price: parseFloat(extraForm.price),
      duration: parseInt(extraForm.duration),
    };

    setExtras([...extras, newExtra]);
    setExtraForm({ name: '', description: '', price: '', duration: '' });
    setShowExtraModal(false);
  };

  const handleRemoveExtra = (index: number) => {
    setExtras(extras.filter((_, i) => i !== index));
  };

  const handleSavePackage = async () => {
    // Validasyon
    if (!formData.name.trim()) {
      Alert.alert('Uyarı', 'Paket adı giriniz');
      return;
    }

    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      Alert.alert('Uyarı', 'Geçerli bir fiyat giriniz');
      return;
    }

    if (!formData.duration || parseInt(formData.duration) <= 0) {
      Alert.alert('Uyarı', 'Geçerli bir süre giriniz');
      return;
    }

    if (services.length === 0) {
      Alert.alert('Uyarı', 'En az bir hizmet ekleyiniz');
      return;
    }

    try {
      setLoading(true);

      const packageData = {
        name: formData.name,
        description: formData.description,
        packageType: formData.packageType,
        basePrice: parseFloat(formData.basePrice),
        duration: parseInt(formData.duration),
        services,
        extras: extras.length > 0 ? extras : undefined,
        availableFor: formData.availableFor,
        requirements: {
          requiresPower: formData.requiresPower,
          requiresWater: formData.requiresWater,
          requiresCoveredArea: formData.requiresCoveredArea,
        },
      };

      let response;
      if (editingPackage) {
        response = await apiService.CarWashService.updateWashPackage(editingPackage._id, packageData);
      } else {
        response = await apiService.CarWashService.createWashPackage(packageData);
      }

      if (response.success) {
        Alert.alert('Başarılı', editingPackage ? 'Paket güncellendi' : 'Paket oluşturuldu');
        setShowCreateModal(false);
        resetForm();
        await fetchPackages();
      } else {
        Alert.alert('Hata', response.message || 'İşlem başarısız');
      }
    } catch (error) {
      Alert.alert('Hata', 'Paket kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = (pkg: WashPackage) => {
    Alert.alert(
      'Paketi Sil',
      `"${pkg.name}" paketini silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.CarWashService.deleteWashPackage(pkg._id);
              if (response.success) {
                Alert.alert('Başarılı', 'Paket silindi');
                await fetchPackages();
              }
            } catch (error) {
              Alert.alert('Hata', 'Paket silinemedi');
            }
          },
        },
      ]
    );
  };

  const getPackageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      quick_exterior: 'Hızlı Dış Yıkama',
      standard: 'Standart',
      detailed_interior: 'Detaylı İç Temizlik',
      ceramic_protection: 'Seramik Koruma',
      engine: 'Motor Temizliği',
      custom: 'Özel Paket',
    };
    return labels[type] || type;
  };

  const getPackageTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      quick_exterior: '#10B981',
      standard: '#3B82F6',
      detailed_interior: '#8B5CF6',
      ceramic_protection: '#F59E0B',
      engine: '#EF4444',
      custom: '#6B7280',
    };
    return colorMap[type] || '#6B7280';
  };

  const getServiceCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      exterior: 'Dış Temizlik',
      interior: 'İç Temizlik',
      engine: 'Motor',
      special: 'Özel',
    };
    return labels[category] || category;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Paketler yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Yıkama Paketleri
        </Text>
        <TouchableOpacity onPress={handleOpenCreateModal} style={styles.addButton}>
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {packages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="water-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Henüz paket eklemediniz
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Müşterilerinize sunacağınız yıkama paketlerini oluşturun
            </Text>
            <Button
              title="İlk Paketinizi Oluşturun"
              onPress={handleOpenCreateModal}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <View style={styles.packagesContainer}>
            {packages.map((pkg) => (
              <Card key={pkg._id} style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <View style={[styles.packageTypeBadge, { backgroundColor: getPackageTypeColor(pkg.packageType) }]}>
                    <Text style={styles.packageTypeBadgeText}>
                      {getPackageTypeLabel(pkg.packageType)}
                    </Text>
                  </View>
                  <View style={styles.packageActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenEditModal(pkg)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="create-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeletePackage(pkg)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.packageName, { color: colors.text }]}>
                  {pkg.name}
                </Text>
                <Text style={[styles.packageDescription, { color: colors.textSecondary }]}>
                  {pkg.description}
                </Text>

                <View style={styles.packageDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="cash-outline" size={16} color={colors.primary} />
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {pkg.basePrice} TL (A segment)
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {pkg.duration} dakika
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {pkg.availableFor === 'both' ? 'Shop & Mobil' : 
                       pkg.availableFor === 'shop' ? 'Sadece Shop' : 'Sadece Mobil'}
                    </Text>
                  </View>
                </View>

                {pkg.services && pkg.services.length > 0 && (
                  <View style={styles.servicesContainer}>
                    <Text style={[styles.servicesTitle, { color: colors.text }]}>
                      Dahil Olan Hizmetler:
                    </Text>
                    {pkg.services.map((service, index) => (
                      <View key={index} style={styles.serviceItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={[styles.serviceText, { color: colors.textSecondary }]}>
                          {service.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {pkg.extras && pkg.extras.length > 0 && (
                  <View style={styles.extrasContainer}>
                    <Text style={[styles.extrasTitle, { color: colors.text }]}>
                      Ekstra Hizmetler:
                    </Text>
                    {pkg.extras.map((extra, index) => (
                      <View key={index} style={styles.extraItem}>
                        <Text style={[styles.extraName, { color: colors.textSecondary }]}>
                          + {extra.name} (+{extra.price} TL)
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={[styles.statusBadge, { 
                  backgroundColor: pkg.isActive ? '#10B98120' : '#EF444420'
                }]}>
                  <Text style={[styles.statusText, { 
                    color: pkg.isActive ? '#10B981' : '#EF4444' 
                  }]}>
                    {pkg.isActive ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Package Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingPackage ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}
            </Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Paket Adı */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Paket Adı *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Örn: Premium İç-Dış Yıkama"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Açıklama */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Açıklama *</Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Paketin detaylı açıklaması"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Paket Tipi */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Paket Tipi *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['quick_exterior', 'standard', 'detailed_interior', 'ceramic_protection', 'engine', 'custom'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: formData.packageType === type ? getPackageTypeColor(type) : colors.inputBackground,
                        borderColor: formData.packageType === type ? getPackageTypeColor(type) : colors.border,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, packageType: type as any })}
                  >
                    <Text style={[styles.typeChipText, {
                      color: formData.packageType === type ? '#FFFFFF' : colors.textSecondary
                    }]}>
                      {getPackageTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Fiyat ve Süre */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Fiyat (TL) *</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={formData.basePrice}
                  onChangeText={(text) => setFormData({ ...formData, basePrice: text })}
                  placeholder="100"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                  A segment araçlar için
                </Text>
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Süre (dk) *</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={formData.duration}
                  onChangeText={(text) => setFormData({ ...formData, duration: text })}
                  placeholder="45"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Kullanılabilir Alan */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Kullanılabilir Alan</Text>
              <View style={styles.availableForContainer}>
                {[
                  { value: 'both', label: 'Her İkisi', icon: 'checkmark-done' },
                  { value: 'shop', label: 'Sadece İstasyon', icon: 'business' },
                  { value: 'mobile', label: 'Sadece Mobil', icon: 'car' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.availableForOption,
                      {
                        backgroundColor: formData.availableFor === option.value ? colors.primary : colors.inputBackground,
                        borderColor: formData.availableFor === option.value ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, availableFor: option.value as any })}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={formData.availableFor === option.value ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text style={[styles.availableForText, {
                      color: formData.availableFor === option.value ? '#FFFFFF' : colors.textSecondary
                    }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Gereksinimler */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Gereksinimler</Text>
              
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Elektrik Gerektirir</Text>
                <Switch
                  value={formData.requiresPower}
                  onValueChange={(value) => setFormData({ ...formData, requiresPower: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Su Gerektirir</Text>
                <Switch
                  value={formData.requiresWater}
                  onValueChange={(value) => setFormData({ ...formData, requiresWater: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Kapalı Alan Gerektirir</Text>
                <Switch
                  value={formData.requiresCoveredArea}
                  onValueChange={(value) => setFormData({ ...formData, requiresCoveredArea: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
            </View>

            {/* Hizmetler */}
            <View style={styles.formGroup}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.label, { color: colors.text }]}>Dahil Olan Hizmetler *</Text>
                <TouchableOpacity
                  onPress={() => setShowServiceModal(true)}
                  style={styles.addItemButton}
                >
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {services.length === 0 ? (
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                  Pakete dahil olacak hizmetleri ekleyin
                </Text>
              ) : (
                <View style={styles.itemsList}>
                  {services.map((service, index) => (
                    <View key={index} style={[styles.listItem, { backgroundColor: colors.inputBackground }]}>
                      <View style={styles.listItemContent}>
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        <View style={styles.listItemText}>
                          <Text style={[styles.listItemName, { color: colors.text }]}>
                            {service.name}
                          </Text>
                          <Text style={[styles.listItemCategory, { color: colors.textSecondary }]}>
                            {getServiceCategoryLabel(service.category)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveService(index)}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Ekstra Hizmetler */}
            <View style={styles.formGroup}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.label, { color: colors.text }]}>Ekstra Hizmetler (Opsiyonel)</Text>
                <TouchableOpacity
                  onPress={() => setShowExtraModal(true)}
                  style={styles.addItemButton}
                >
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {extras.length === 0 ? (
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                  Ekstra ücret karşılığı sunulan hizmetleri ekleyin
                </Text>
              ) : (
                <View style={styles.itemsList}>
                  {extras.map((extra, index) => (
                    <View key={index} style={[styles.listItem, { backgroundColor: colors.inputBackground }]}>
                      <View style={styles.listItemContent}>
                        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                        <View style={styles.listItemText}>
                          <Text style={[styles.listItemName, { color: colors.text }]}>
                            {extra.name}
                          </Text>
                          <Text style={[styles.listItemCategory, { color: colors.textSecondary }]}>
                            +{extra.price} TL · {extra.duration} dk
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveExtra(index)}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Kaydet Butonu */}
            <Button
              title={editingPackage ? "Güncelle" : "Paketi Oluştur"}
              onPress={handleSavePackage}
              disabled={loading}
              style={styles.saveButton}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Service Modal */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <SafeAreaView style={[styles.smallModalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Hizmet Ekle</Text>
            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Hizmet Adı *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={serviceForm.name}
                onChangeText={(text) => setServiceForm({ ...serviceForm, name: text })}
                placeholder="Örn: Dış Yıkama"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Kategori *</Text>
              <View style={styles.categoryButtons}>
                {['exterior', 'interior', 'engine', 'special'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor: serviceForm.category === cat ? colors.primary : colors.inputBackground,
                        borderColor: serviceForm.category === cat ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setServiceForm({ ...serviceForm, category: cat as any })}
                  >
                    <Text style={[styles.categoryButtonText, {
                      color: serviceForm.category === cat ? '#FFFFFF' : colors.textSecondary
                    }]}>
                      {getServiceCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title="Ekle"
              onPress={handleAddService}
              style={styles.modalButton}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add Extra Modal */}
      <Modal
        visible={showExtraModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowExtraModal(false)}
      >
        <SafeAreaView style={[styles.smallModalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ekstra Hizmet Ekle</Text>
            <TouchableOpacity onPress={() => setShowExtraModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Hizmet Adı *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={extraForm.name}
                onChangeText={(text) => setExtraForm({ ...extraForm, name: text })}
                placeholder="Örn: Motor Temizliği"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Açıklama</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={extraForm.description}
                onChangeText={(text) => setExtraForm({ ...extraForm, description: text })}
                placeholder="Hizmet açıklaması"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Fiyat (TL) *</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={extraForm.price}
                  onChangeText={(text) => setExtraForm({ ...extraForm, price: text })}
                  placeholder="50"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Süre (dk) *</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={extraForm.duration}
                  onChangeText={(text) => setExtraForm({ ...extraForm, duration: text })}
                  placeholder="20"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Button
              title="Ekle"
              onPress={handleAddExtra}
              style={styles.modalButton}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  addButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.h3,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.body,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing.xl,
  },
  packagesContainer: {
    padding: spacing.md,
  },
  packageCard: {
    marginBottom: spacing.md,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  packageTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  packageTypeBadgeText: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '600',
  },
  packageActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  packageName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  packageDescription: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  packageDetails: {
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailText: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  servicesContainer: {
    marginBottom: spacing.md,
  },
  servicesTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  serviceText: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  extrasContainer: {
    marginBottom: spacing.md,
  },
  extrasTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  extraItem: {
    marginBottom: spacing.xs,
  },
  extraName: {
    ...typography.body,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  smallModalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h2,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  typeChipText: {
    ...typography.body,
    fontWeight: '500',
  },
  availableForContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  availableForOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  availableForText: {
    ...typography.body,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    ...typography.body,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  addItemButton: {
    padding: spacing.xs,
  },
  itemsList: {
    gap: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  listItemName: {
    ...typography.bodyBold,
  },
  listItemCategory: {
    ...typography.caption,
  },
  saveButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  categoryButtonText: {
    ...typography.body,
    fontWeight: '500',
  },
  modalButton: {
    marginTop: spacing.lg,
  },
});

