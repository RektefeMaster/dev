import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/shared/context/SettingsContext';
import { colors, typography, spacing, borderRadius, shadows } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  isSelected: boolean;
}

export default function ServiceAreasScreen() {
  const { serviceCategories, updateServiceCategories } = useSettings();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    loadServiceCategories();
  }, []);

  useEffect(() => {
    setSelectedCategories(serviceCategories);
  }, [serviceCategories]);

  const loadServiceCategories = async () => {
    try {
      setLoading(true);
      const response = await apiService.getServiceCategories();
      
      if (response.success && response.data) {
        const categoriesData = response.data.map((category: any) => ({
          id: category._id || category.id,
          name: category.name,
          description: category.description || '',
          icon: category.icon || 'construct',
          isSelected: serviceCategories.includes(category._id || category.id)
        }));
        setCategories(categoriesData);
      } else {
        // Fallback data
        setCategories(getDefaultCategories());
      }
    } catch (error) {
      console.error('Service categories load error:', error);
      setCategories(getDefaultCategories());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCategories = (): ServiceCategory[] => [
    // ÇEKİCİ HİZMETLERİ
    { id: '1', name: 'Araç Çekici', description: 'Arızalı araçları çekme hizmeti', icon: 'car-outline', isSelected: false },
    { id: '2', name: 'Yol Yardımı', description: 'Yolda kalan araçlara acil müdahale', icon: 'warning-outline', isSelected: false },
    { id: '3', name: 'Kaza Çekici', description: 'Kaza geçiren araçları çekme', icon: 'alert-circle-outline', isSelected: false },

    // YIKAMA HİZMETLERİ
    { id: '4', name: 'Otomatik Yıkama', description: 'Otomatik araç yıkama hizmeti', icon: 'water-outline', isSelected: false },
    { id: '5', name: 'El Yıkama', description: 'Detaylı el ile araç yıkama', icon: 'hand-left-outline', isSelected: false },
    { id: '6', name: 'İç Temizlik', description: 'Araç içi detaylı temizlik', icon: 'sparkles-outline', isSelected: false },
    { id: '7', name: 'Motor Yıkama', description: 'Motor bölümü temizliği', icon: 'settings-outline', isSelected: false },
    { id: '8', name: 'Cila ve Wax', description: 'Araç cilalama ve koruma', icon: 'diamond-outline', isSelected: false },

    // LASTİK HİZMETLERİ
    { id: '9', name: 'Lastik Değişimi', description: 'Lastik sökme ve takma', icon: 'radio-button-on-outline', isSelected: false },
    { id: '10', name: 'Lastik Tamiri', description: 'Delik lastik onarımı', icon: 'construct-outline', isSelected: false },
    { id: '11', name: 'Balans Ayarı', description: 'Lastik balans ayarlama', icon: 'sync-outline', isSelected: false },
    { id: '12', name: 'Rot Ayarı', description: 'Direksiyon rot ayarı', icon: 'git-merge-outline', isSelected: false },
    { id: '13', name: 'Lastik Montaj', description: 'Yeni lastik montajı', icon: 'add-circle-outline', isSelected: false },

    // TAMİR BAKIM HİZMETLERİ
    { id: '14', name: 'Motor Tamiri', description: 'Motor arızaları ve bakımı', icon: 'car-sport-outline', isSelected: false },
    { id: '15', name: 'Fren Sistemi', description: 'Fren balata, disk ve hidrolik', icon: 'stop-circle-outline', isSelected: false },
    { id: '16', name: 'Elektrik Sistemi', description: 'Elektriksel arızalar ve bakım', icon: 'flash-outline', isSelected: false },
    { id: '17', name: 'Klima Sistemi', description: 'Klima bakım ve tamiri', icon: 'snow-outline', isSelected: false },
    { id: '18', name: 'Akü Değişimi', description: 'Akü montaj ve test', icon: 'battery-charging-outline', isSelected: false },
    { id: '19', name: 'Yağ Değişimi', description: 'Motor yağı ve filtre değişimi', icon: 'water-outline', isSelected: false },
    { id: '20', name: 'Egzoz Sistemi', description: 'Egzoz borusu ve susturucu', icon: 'volume-high-outline', isSelected: false },
    { id: '21', name: 'Kaporta Tamiri', description: 'Boyama ve kaporta işleri', icon: 'color-palette-outline', isSelected: false },
    { id: '22', name: 'Cam Değişimi', description: 'Ön ve arka cam değişimi', icon: 'eye-outline', isSelected: false },
    { id: '23', name: 'Periyodik Bakım', description: 'Genel araç bakım hizmetleri', icon: 'calendar-outline', isSelected: false },
  ];

  const toggleCategory = (categoryId: string) => {
    const newSelected = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setSelectedCategories(newSelected);
    
    // Update categories state
    setCategories(prev => prev.map(cat => ({
      ...cat,
      isSelected: newSelected.includes(cat.id)
    })));
  };

  const saveCategories = async () => {
    try {
      setLoading(true);
      await updateServiceCategories(selectedCategories);
      Alert.alert('Başarılı', 'Hizmet alanlarınız güncellendi');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Hizmet alanları güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryItem = ({ item }: { item: ServiceCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        item.isSelected && styles.selectedCategoryItem
      ]}
      onPress={() => toggleCategory(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.categoryLeft}>
        <View style={[
          styles.categoryIconContainer,
          item.isSelected && styles.selectedCategoryIconContainer
        ]}>
          <Ionicons 
            name={item.icon as any} 
            size={24} 
            color={item.isSelected ? colors.primary.main : colors.text.secondary} 
          />
        </View>
        
        <View style={styles.categoryContent}>
          <Text style={[
            styles.categoryTitle,
            item.isSelected && styles.selectedCategoryTitle
          ]}>
            {item.name}
          </Text>
          <Text style={[
            styles.categoryDescription,
            item.isSelected && styles.selectedCategoryDescription
          ]}>
            {item.description}
          </Text>
        </View>
      </View>
      
      <View style={[
        styles.checkbox,
        item.isSelected && styles.selectedCheckbox
      ]}>
        {item.isSelected && (
          <Ionicons name="checkmark" size={16} color={colors.text.inverse} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.main} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <BackButton />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Hizmet Alanlarım</Text>
              <Text style={styles.headerSubtitle}>Uzmanlık alanlarınızı seçin</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Seçilen Alanlar Sayısı */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary.main} />
            </View>
            <View style={styles.statsContent}>
              <Text style={styles.statsNumber}>{selectedCategories.length}</Text>
              <Text style={styles.statsLabel}>Hizmet Alanı Seçildi</Text>
            </View>
          </View>
        </View>

        {/* Kategoriler Listesi */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Mevcut Hizmet Alanları</Text>
          
          <ScrollView showsVerticalScrollIndicator={false} style={styles.categoriesScrollView}>
            {/* ÇEKİCİ HİZMETLERİ */}
            <View style={styles.categorySection}>
              <Text style={styles.categorySectionTitle}>ÇEKİCİ HİZMETLERİ</Text>
              {categories.filter(cat => ['1', '2', '3'].includes(cat.id)).map(renderCategoryItem)}
            </View>

            {/* YIKAMA HİZMETLERİ */}
            <View style={styles.categorySection}>
              <Text style={styles.categorySectionTitle}>YIKAMA HİZMETLERİ</Text>
              {categories.filter(cat => ['4', '5', '6', '7', '8'].includes(cat.id)).map(renderCategoryItem)}
            </View>

            {/* LASTİK HİZMETLERİ */}
            <View style={styles.categorySection}>
              <Text style={styles.categorySectionTitle}>LASTİK HİZMETLERİ</Text>
              {categories.filter(cat => ['9', '10', '11', '12', '13'].includes(cat.id)).map(renderCategoryItem)}
            </View>

            {/* TAMİR BAKIM HİZMETLERİ */}
            <View style={styles.categorySection}>
              <Text style={styles.categorySectionTitle}>TAMİR BAKIM HİZMETLERİ</Text>
              {categories.filter(cat => ['14', '15', '16', '17', '18', '19', '20', '21', '22', '23'].includes(cat.id)).map(renderCategoryItem)}
            </View>
          </ScrollView>
        </View>

        {/* Kaydet Butonu */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              loading && styles.disabledButton,
              selectedCategories.length === 0 && styles.disabledButton
            ]}
            onPress={saveCategories}
            disabled={loading || selectedCategories.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.primary.main,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.inverse,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statsContainer: {
    marginBottom: spacing.xl,
  },
  statsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  statsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statsContent: {
    flex: 1,
  },
  statsNumber: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  statsLabel: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
  },
  categoriesContainer: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  categoriesList: {
    paddingBottom: spacing.lg,
  },
  categoriesScrollView: {
    flex: 1,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categorySectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary.main + '10',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    textAlign: 'center',
  },
  categoryItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  selectedCategoryItem: {
    backgroundColor: colors.primary.main + '10',
    borderColor: colors.primary.main,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  selectedCategoryIconContainer: {
    backgroundColor: colors.primary.main + '20',
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  selectedCategoryTitle: {
    color: colors.primary.main,
  },
  categoryDescription: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  selectedCategoryDescription: {
    color: colors.text.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckbox: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  buttonContainer: {
    paddingBottom: spacing.xl,
  },
  saveButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
