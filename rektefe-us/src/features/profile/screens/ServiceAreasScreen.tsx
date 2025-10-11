import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Linking,
  TouchableOpacity,
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
  const { serviceCategories } = useSettings();
  const navigation = useNavigation();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  useEffect(() => {
    const defaultCategories = getDefaultCategories();
    
    // Load user's selected categories
    if (serviceCategories && serviceCategories.length > 0) {
      // Backend'den gelen kategorileri Frontend formatına çevir
      const frontendCategories = serviceCategories.map(cat => {
        const reverseMapping: { [key: string]: string } = {
          'repair': 'tamir-bakim',
          'wash': 'arac-yikama',
          'tire': 'lastik',
          'towing': 'cekici'
        };
        return reverseMapping[cat] || cat;
      });
      
      setCategories(defaultCategories.map(cat => ({
        ...cat,
        isSelected: frontendCategories.includes(cat.id)
      })));
    } else {
      setCategories(defaultCategories);
    }
  }, [serviceCategories]);

  const getDefaultCategories = (): ServiceCategory[] => [
    { 
      id: 'tamir-bakim', 
      name: 'Tamir Bakım', 
      description: 'Genel bakım, ağır bakım, alt takım, üst takım, elektronik elektrik', 
      icon: 'construct-outline', 
      isSelected: false 
    },
    { 
      id: 'arac-yikama', 
      name: 'Araç Yıkama', 
      description: 'Otomatik yıkama, el ile yıkama, iç temizlik, cila ve wax', 
      icon: 'water-outline', 
      isSelected: false 
    },
    { 
      id: 'lastik', 
      name: 'Lastik', 
      description: 'Lastik değişimi, balans ayarı, rot ayarı, lastik oteli', 
      icon: 'disc-outline', 
      isSelected: false 
    },
    { 
      id: 'cekici', 
      name: 'Çekici', 
      description: 'Arızalı araç çekme, yol yardımı, kaza çekici hizmetleri', 
      icon: 'car-outline', 
      isSelected: false 
    },
  ];

  const handleContactPress = () => {
    // Telefon numarasını ara
    Linking.openURL('tel:+905551234567');
  };

  const handleEmailPress = () => {
    // E-posta gönder
    Linking.openURL('mailto:info@rektefe.com?subject=Hizmet Kategorisi Değişikliği Talebi');
  };

  const renderCategoryItem = ({ item }: { item: ServiceCategory }) => (
    <View
      style={[
        styles.categoryCard,
        item.isSelected && styles.selectedCategoryCard,
      ]}
    >
      <View style={styles.categoryIconContainer}>
        <Ionicons
          name={item.icon as any}
          size={32}
          color={item.isSelected ? colors.primary.main : colors.text.tertiary}
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
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color={colors.info.main} style={styles.infoIcon} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Hizmet Detayı</Text>
          <Text style={styles.infoText}>
            Aşağıda verdiğiniz hizmet kategorileri görüntülenmektedir.
          </Text>
        </View>
      </View>
      
      <Text style={styles.title}>Hizmet Alanlarınız</Text>
      <Text style={styles.subtitle}>
        Aktif olarak sunduğunuz hizmet kategorileri
      </Text>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <View style={styles.contactBox}>
        <Ionicons name="call" size={24} color={colors.primary.main} style={styles.contactIcon} />
        <View style={styles.contactContent}>
          <Text style={styles.contactTitle}>Hizmet Kategorisi Değiştirmek İçin</Text>
          <Text style={styles.contactText}>Bizimle iletişime geçin</Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleEmailPress}
              activeOpacity={0.7}
            >
              <Ionicons name="mail" size={18} color={colors.primary.main} />
              <Text style={styles.contactButtonText}>info@rektefe.com</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleContactPress}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={18} color={colors.primary.main} />
              <Text style={styles.contactButtonText}>+90 (555) 123 45 67</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  
  // Info Box Styles
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.info.main,
  },
  infoIcon: {
    marginRight: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.h5.fontSize,
    fontWeight: '600',
    color: colors.info.dark,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.body2.fontSize,
    color: colors.info.dark,
    lineHeight: 20,
  },
  
  // Category Card Styles
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border.light,
    ...shadows.small,
  },
  selectedCategoryCard: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.ultraLight,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.h5.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  selectedCategoryName: {
    color: colors.primary.main,
  },
  categoryDescription: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  selectedCategoryDescription: {
    color: colors.text.primary,
  },
  checkmark: {
    marginLeft: spacing.sm,
  },
  
  // Footer Styles
  footer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  contactBox: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary.light,
    ...shadows.medium,
  },
  contactIcon: {
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  contactText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  contactButtons: {
    gap: spacing.sm,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.ultraLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.light,
  },
  contactButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '500',
    color: colors.primary.main,
    marginLeft: spacing.sm,
  },
});
