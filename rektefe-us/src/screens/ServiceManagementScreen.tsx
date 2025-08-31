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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/theme';
import { ServiceCategory, Service, ServicePackage } from '../types/common';
import apiService from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components';

const { width } = Dimensions.get('window');

// Usta hizmet kategorileri - gerçek verilerle güncellenmiş
const MECHANIC_SERVICE_CATEGORIES = [
  {
    id: 'genel-bakim',
    name: 'Genel Bakım',
    description: 'Araç genel bakım ve kontrol hizmetleri',
    icon: 'construct',
    color: '#2563EB',
    services: ['Yağ değişimi', 'Filtre değişimi', 'Genel kontrol', 'Periyodik bakım']
  },
  {
    id: 'motor',
    name: 'Motor Servisi',
    description: 'Motor bakım ve onarım hizmetleri',
    icon: 'settings',
    color: '#DC2626',
    services: ['Motor yağı değişimi', 'Motor filtresi', 'Motor temizliği', 'Motor onarımı']
  },
  {
    id: 'fren-sistemi',
    name: 'Fren Sistemi',
    description: 'Fren bakım ve onarım hizmetleri',
    icon: 'car-sport',
    color: '#B91C1C',
    services: ['Fren balata değişimi', 'Fren sıvısı değişimi', 'Fren disk değişimi', 'Fren ayarı']
  },
  {
    id: 'alt-takim',
    name: 'Alt Takım',
    description: 'Alt takım bakım ve onarım hizmetleri',
    icon: 'car',
    color: '#059669',
    services: ['Amortisör değişimi', 'Yay değişimi', 'Burç değişimi', 'Alt takım ayarı']
  },
  {
    id: 'elektrik-elektronik',
    name: 'Elektrik-Elektronik',
    description: 'Elektrik ve elektronik sistem hizmetleri',
    icon: 'flash',
    color: '#F59E0B',
    services: ['Akü değişimi', 'Far ayarı', 'Elektrik arıza tespiti', 'Kablolama']
  },
  {
    id: 'kaporta-boya',
    name: 'Kaporta & Boya',
    description: 'Kaporta onarım ve boya hizmetleri',
    icon: 'color-palette',
    color: '#7C3AED',
    services: ['Kaporta onarımı', 'Boya yapımı', 'Çizik giderme', 'Renk eşleştirme']
  },
  {
    id: 'ust-takim',
    name: 'Üst Takım',
    description: 'Üst takım bakım ve onarım hizmetleri',
    icon: 'car-sport',
    color: '#0891B2',
    services: ['Direksiyon ayarı', 'Rot ayarı', 'Üst takım kontrolü', 'Üst takım onarımı']
  },
  {
    id: 'agir-bakim',
    name: 'Ağır Bakım',
    description: 'Kapsamlı araç bakım hizmetleri',
    icon: 'build',
    color: '#EA580C',
    services: ['Motor revizyonu', 'Şanzıman revizyonu', 'Kapsamlı kontrol', 'Sistem testleri']
  },
  {
    id: 'yedek-parca',
    name: 'Yedek Parça',
    description: 'Kaliteli yedek parça satışı',
    icon: 'cube',
    color: '#16A34A',
    services: ['Orijinal parça', 'Kaliteli muadil', 'Parça değişimi', 'Garantili hizmet']
  },
  {
    id: 'lastik',
    name: 'Lastik Servisi',
    description: 'Lastik bakım ve değişim hizmetleri',
    icon: 'ellipse',
    color: '#9333EA',
    services: ['Lastik değişimi', 'Lastik rotasyonu', 'Balans ayarı', 'Lastik onarımı']
  },
  {
    id: 'ekspertiz',
    name: 'Ekspertiz',
    description: 'Detaylı araç ekspertiz hizmeti',
    icon: 'search',
    color: '#0D9488',
    services: ['Detaylı inceleme', 'Rapor hazırlama', 'Değer tespiti', 'Güvenlik kontrolü']
  },
  {
    id: 'egzoz-emisyon',
    name: 'Egzoz & Emisyon',
    description: 'Egzoz ve emisyon test hizmetleri',
    icon: 'cloud',
    color: '#475569',
    services: ['Egzoz testi', 'Emisyon ölçümü', 'Egzoz onarımı', 'Katalizör kontrolü']
  },
  {
    id: 'sigorta-kasko',
    name: 'Sigorta & Kasko',
    description: 'Araç sigorta ve kasko hizmetleri',
    icon: 'shield-checkmark',
    color: '#15803D',
    services: ['Sigorta işlemleri', 'Kasko işlemleri', 'Hasar tespiti', 'Sigorta danışmanlığı']
  },
  {
    id: 'arac-yikama',
    name: 'Araç Yıkama',
    description: 'Profesyonel araç yıkama hizmeti',
    icon: 'water',
    color: '#0284C7',
    services: ['Dış yıkama', 'İç temizlik', 'Detaylı temizlik', 'Cilalama']
  }
];

const ServiceManagementScreen = () => {
  const { user, token } = useAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'services' | 'packages'>('categories');
  const [userServiceCategories, setUserServiceCategories] = useState<string[]>([]);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  
  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: 'construct',
    color: '#2563EB',
  });
  
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: '',
    duration: '',
  });
  
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    services: [] as string[],
    totalPrice: '',
    discount: '',
  });

  useEffect(() => {
    fetchData();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    if (!token) return;
    
    try {
      const response = await apiService.getMechanicProfile();
      if (response.success && response.data) {
        setUserServiceCategories(response.data.serviceCategories || []);
      }
    } catch (error) {
      console.error('Kullanıcı profili alınamadı:', error);
    }
  };

  const fetchData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const [categoriesRes, servicesRes, packagesRes] = await Promise.all([
        apiService.getServiceCategories(),
        apiService.getServices(),
        apiService.getServicePackages(),
      ]);

      if (categoriesRes.success) setCategories(categoriesRes.data || []);
      if (servicesRes.success) setServices(servicesRes.data || []);
      if (packagesRes.success) setPackages(packagesRes.data || []);
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
    await Promise.all([fetchData(), fetchUserProfile()]);
    setRefreshing(false);
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      Alert.alert('Hata', 'Kategori adı gerekli');
      return;
    }

    try {
      const response = await apiService.addService({
        ...categoryForm,
        type: 'category',
      });

      if (response.success) {
        Alert.alert('Başarılı', 'Kategori eklendi');
        setShowCategoryModal(false);
        setCategoryForm({ name: '', description: '', icon: 'construct', color: '#2563EB' });
        fetchData();
      }
    } catch (error: any) {
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    }
  };

  const handleAddService = async () => {
    if (!serviceForm.name.trim() || !serviceForm.price || !serviceForm.categoryId) {
      Alert.alert('Hata', 'Tüm alanlar gerekli');
      return;
    }

    try {
      const response = await apiService.addService({
        ...serviceForm,
        price: parseFloat(serviceForm.price),
        duration: parseInt(serviceForm.duration),
        mechanicId: user?._id,
      });

      if (response.success) {
        Alert.alert('Başarılı', 'Hizmet eklendi');
        setShowServiceModal(false);
        setServiceForm({ name: '', description: '', categoryId: '', price: '', duration: '' });
        fetchData();
      }
    } catch (error: any) {
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    }
  };

  const handleAddPackage = async () => {
    if (!packageForm.name.trim() || packageForm.services.length === 0) {
      Alert.alert('Hata', 'Paket adı ve en az bir hizmet gerekli');
      return;
    }

    try {
      const response = await apiService.createServicePackage({
        ...packageForm,
        totalPrice: parseFloat(packageForm.totalPrice),
        discount: parseFloat(packageForm.discount),
        mechanicId: user?._id,
      });

      if (response.success) {
        Alert.alert('Başarılı', 'Servis paketi oluşturuldu');
        setShowPackageModal(false);
        setPackageForm({ name: '', description: '', services: [], totalPrice: '', discount: '' });
        fetchData();
      }
    } catch (error: any) {
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    }
  };

  // Kullanıcının seçtiği hizmet kategorilerini filtrele
  const getUserSelectedCategories = () => {
    if (userServiceCategories.length === 0) {
      return MECHANIC_SERVICE_CATEGORIES; // Hiç seçilmemişse tümünü göster
    }
    
    // Kullanıcının seçtiği kategorileri eşleştir
    const matchedCategories = MECHANIC_SERVICE_CATEGORIES.filter(category => {
      return userServiceCategories.some(userCategory => {
        const userCat = userCategory.toLowerCase().trim();
        const catName = category.name.toLowerCase().trim();
        const catId = category.id.toLowerCase().trim();
        
        // Tam eşleşme kontrolü
        if (userCat === catName || userCat === catId) return true;
        
        // Kısmi eşleşme kontrolü
        if (userCat.includes(catName) || catName.includes(userCat)) return true;
        
        // Özel eşleşmeler
        if (userCat === 'motor' && catId === 'motor') return true;
        if (userCat === 'fren' && catId === 'fren-sistemi') return true;
        if (userCat === 'elektrik-elektronik' && catId === 'elektrik-elektronik') return true;
        if (userCat === 'kaporta-boya' && catId === 'kaporta-boya') return true;
        if (userCat === 'ust-takim' && catId === 'ust-takim') return true;
        if (userCat === 'alt-takim' && catId === 'alt-takim') return true;
        if (userCat === 'agir-bakim' && catId === 'agir-bakim') return true;
        if (userCat === 'genel-bakim' && catId === 'genel-bakim') return true;
        
        return false;
      });
    });
    
    console.log('Kullanıcı kategorileri:', userServiceCategories);
    console.log('Eşleşen kategoriler:', matchedCategories.map(c => c.name));
    
    return matchedCategories.length > 0 ? matchedCategories : MECHANIC_SERVICE_CATEGORIES;
  };

  const renderCategoryCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.categoryCard}>
      <View style={[styles.categoryGradient, { backgroundColor: item.color }]}>
        <View style={styles.categoryIconContainer}>
          <Ionicons name={item.icon as any} size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.categoryStats}>
          <Text style={styles.categoryStatsText}>
            {item.services.length} Hizmet
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderServiceCard = ({ item }: { item: Service }) => {
    const category = categories.find(c => c._id === item.categoryId);
    
    return (
      <TouchableOpacity style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <View style={styles.servicePrice}>
            <Text style={styles.servicePriceText}>{item.price} ₺</Text>
          </View>
        </View>
        
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.serviceFooter}>
          <View style={styles.serviceCategory}>
            <Text style={styles.serviceCategoryText}>{category?.name || 'Kategori Yok'}</Text>
          </View>
          <View style={styles.serviceDuration}>
            <Text style={styles.serviceDurationText}>{item.duration} dk</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPackageCard = ({ item }: { item: ServicePackage }) => (
    <TouchableOpacity style={styles.packageCard}>
      <View style={[styles.packageGradient, { backgroundColor: '#7C3AED' }]}>
        <View style={styles.packageHeader}>
          <Text style={styles.packageName}>{item.name}</Text>
          <View style={styles.packagePrice}>
            <Text style={styles.packageOriginalPrice}>{item.totalPrice} ₺</Text>
            <Text style={styles.packageDiscountedPrice}>
              {item.totalPrice - (item.totalPrice * item.discount / 100)} ₺
            </Text>
          </View>
        </View>
        
        <Text style={styles.packageDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.packageFooter}>
          <Text style={styles.packageServices}>
            {item.services.length} Hizmet
          </Text>
          <View style={styles.packageDiscount}>
            <Text style={styles.packageDiscountText}>%{item.discount} İndirim</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTabButton = (tab: 'categories' | 'services' | 'packages', label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons name={icon as any} size={24} style={styles.tabIcon} />
      <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary.main} />
        <View style={styles.loadingContainer}>
          <Ionicons name="construct" size={48} color={colors.primary.main} />
          <Text style={styles.loadingText}>Servisler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.main} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Servis Yönetimi</Text>
            <Text style={styles.headerSubtitle}>Hizmetlerinizi ve kategorilerinizi yönetin</Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('categories', 'Kategoriler', 'folder')}
        {renderTabButton('services', 'Hizmetler', 'hammer')}
        {renderTabButton('packages', 'Paketler', 'gift')}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Add Button */}
        <View style={styles.addButtonContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              if (activeTab === 'categories') setShowCategoryModal(true);
              else if (activeTab === 'services') setShowServiceModal(true);
              else if (activeTab === 'packages') setShowPackageModal(true);
            }}
          >
            <View style={styles.addButtonGradient}>
              <Ionicons name="add-circle" size={32} color="#FFFFFF" />
              <Text style={styles.addButtonText}>+ Yeni {activeTab === 'categories' ? 'Kategori' : activeTab === 'services' ? 'Hizmet' : 'Paket'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <FlatList
            data={getUserSelectedCategories()}
            renderItem={renderCategoryCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.gridContainer}
          />
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <FlatList
            data={services}
            renderItem={renderServiceCard}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <FlatList
            data={packages}
            renderItem={renderPackageCard}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </ScrollView>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Kategori Ekle</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Kategori Adı"
              value={categoryForm.name}
              onChangeText={(text) => setCategoryForm({ ...categoryForm, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Açıklama"
              value={categoryForm.description}
              onChangeText={(text) => setCategoryForm({ ...categoryForm, description: text })}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCategoryModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddCategory}
              >
                <View style={styles.saveButtonGradient}>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Service Modal */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Hizmet Ekle</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Hizmet Adı"
              value={serviceForm.name}
              onChangeText={(text) => setServiceForm({ ...serviceForm, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Açıklama"
              value={serviceForm.description}
              onChangeText={(text) => setServiceForm({ ...serviceForm, description: text })}
              multiline
            />
            
            <TextInput
              style={styles.input}
              placeholder="Fiyat (₺)"
              value={serviceForm.price}
              onChangeText={(text) => setServiceForm({ ...serviceForm, price: text })}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Süre (dakika)"
              value={serviceForm.duration}
              onChangeText={(text) => setServiceForm({ ...serviceForm, duration: text })}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowServiceModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddService}
              >
                <View style={styles.saveButtonGradient}>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Package Modal */}
      <Modal
        visible={showPackageModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Servis Paketi</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Paket Adı"
              value={packageForm.name}
              onChangeText={(text) => setPackageForm({ ...packageForm, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Açıklama"
              value={packageForm.description}
              onChangeText={(text) => setPackageForm({ ...packageForm, description: text })}
              multiline
            />
            
            <TextInput
              style={styles.input}
              placeholder="Toplam Fiyat (₺)"
              value={packageForm.totalPrice}
              onChangeText={(text) => setPackageForm({ ...packageForm, totalPrice: text })}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="İndirim (%)"
              value={packageForm.discount}
              onChangeText={(text) => setPackageForm({ ...packageForm, discount: text })}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPackageModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddPackage}
              >
                <View style={styles.saveButtonGradient}>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </View>
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
    backgroundColor: colors.background.default,
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
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
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
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
  },
  activeTabButton: {
    backgroundColor: colors.primary.light + '20',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
    color: colors.text.secondary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  activeTabLabel: {
    color: colors.primary.main,
  },
  content: {
    flex: 1,
  },
  addButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  addButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.primary.main,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
  gridContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  categoryCard: {
    flex: 1,
    margin: spacing.xs,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  categoryGradient: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minHeight: 120,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  categoryDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  categoryStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  categoryStatsText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  serviceCard: {
    backgroundColor: colors.background.paper,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
    flex: 1,
  },
  servicePrice: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  servicePriceText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  serviceDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceCategory: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  serviceCategoryText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  serviceDuration: {
    backgroundColor: colors.warning.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  serviceDurationText: {
    fontSize: 12,
    color: colors.warning.main,
    fontWeight: '600' as const,
  },
  packageCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.medium,
  },
  packageGradient: {
    padding: spacing.md,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    flex: 1,
  },
  packagePrice: {
    alignItems: 'flex-end',
  },
  packageOriginalPrice: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'line-through',
  },
  packageDiscountedPrice: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  packageDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageServices: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  packageDiscount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  packageDiscountText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.default,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.primary.main,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
});

export default ServiceManagementScreen;
