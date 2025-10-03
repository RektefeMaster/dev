import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '@/shared/context/SettingsContext';
import { colors, spacing, typography, borderRadius, shadows } from '@/shared/theme';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  isSelected: boolean;
}

export default function ServiceAreasScreen() {
  const { serviceCategories, updateServiceCategories } = useSettings();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    const defaultCategories = getDefaultCategories();
    setCategories(defaultCategories);
    
    // Load user's selected categories
    if (serviceCategories && serviceCategories.length > 0) {
      setSelectedCategories(serviceCategories);
      setCategories(prev => prev.map(cat => ({
        ...cat,
        isSelected: serviceCategories.includes(cat.id)
      })));
    }
  }, [serviceCategories]);

  const getDefaultCategories = (): ServiceCategory[] => [
    // TAMİR BAKIM HİZMETLERİ
    { 
      id: 'tamir-bakim', 
      name: 'Tamir Bakım', 
      description: 'Genel bakım, ağır bakım, alt takım, üst takım, elektronik elektrik', 
      icon: 'construct-outline', 
      isSelected: false 
    },

    // ARAÇ YIKAMA HİZMETLERİ
    { 
      id: 'arac-yikama', 
      name: 'Araç Yıkama', 
      description: 'Otomatik yıkama, el ile yıkama, iç temizlik, cila ve wax', 
      icon: 'water-outline', 
      isSelected: false 
    },

    // LASTİK HİZMETLERİ
    { 
      id: 'lastik', 
      name: 'Lastik', 
      description: 'Lastik değişimi, balans ayarı, rot ayarı, lastik oteli', 
      icon: 'disc-outline', 
      isSelected: false 
    },

    // ÇEKİCİ HİZMETLERİ
    { 
      id: 'cekici', 
      name: 'Çekici', 
      description: 'Arızalı araç çekme, yol yardımı, kaza çekici hizmetleri', 
      icon: 'car-outline', 
      isSelected: false 
    },
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
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Hizmet alanları güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryItem = ({ item }: { item: ServiceCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        item.isSelected && styles.selectedCategoryCard,
      ]}
      onPress={() => toggleCategory(item.id)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        item.isSelected && styles.selectedIconContainer,
      ]}>
        <Ionicons
          name={item.icon as any}
          size={32}
          color={item.isSelected ? colors.text.inverse : colors.primary.main}
        />
      </View>
      
      <View style={styles.categoryContent}>
        <Text style={[
          styles.categoryName,
          item.isSelected && styles.selectedCategoryName,
        ]}>
          {item.name}
        </Text>
        <Text style={[
          styles.categoryDescription,
          item.isSelected && styles.selectedCategoryDescription,
        ]}>
          {item.description}
        </Text>
      </View>
      
      {item.isSelected && (
        <View style={styles.checkmark}>
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={colors.success.main}
          />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Hangi hizmet alanlarında çalışmak istiyorsunuz?</Text>
      <Text style={styles.subtitle}>
        Seçtiğiniz alanlara göre menünüz güncellenecek.
      </Text>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[
          styles.saveButton,
          selectedCategories.length === 0 && styles.disabledButton,
        ]}
        onPress={saveCategories}
        disabled={loading || selectedCategories.length === 0}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.inverse} size="small" />
        ) : (
          <Text style={styles.saveButtonText}>
            Kaydet ({selectedCategories.length})
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  categoryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.small,
  },
  selectedCategoryCard: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.main,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  selectedIconContainer: {
    backgroundColor: colors.primary.main,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  selectedCategoryName: {
    color: colors.primary.dark,
  },
  categoryDescription: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  selectedCategoryDescription: {
    color: colors.primary.dark,
  },
  checkmark: {
    marginLeft: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.medium,
  },
  disabledButton: {
    backgroundColor: colors.text.tertiary,
  },
  saveButtonText: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});