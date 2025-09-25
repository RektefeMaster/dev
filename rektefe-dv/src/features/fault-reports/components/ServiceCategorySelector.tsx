import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

interface ServiceCategorySelectorProps {
  serviceCategories: ServiceCategory[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  loading?: boolean;
}

export const ServiceCategorySelector: React.FC<ServiceCategorySelectorProps> = ({
  serviceCategories,
  selectedCategory,
  onSelectCategory,
  loading = false,
}) => {
  const { theme } = useTheme();

  const renderCategoryItem = ({ item }: { item: ServiceCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        {
          backgroundColor: theme.colors.background.secondary,
          borderColor: selectedCategory === item.id ? theme.colors.primary.main : theme.colors.border.primary,
        },
        selectedCategory === item.id && styles.categoryItemSelected,
      ]}
      onPress={() => onSelectCategory(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <MaterialCommunityIcons name={item.icon as any} size={24} color="#fff" />
      </View>
      <View style={styles.categoryContent}>
        <Text style={[styles.categoryName, { color: theme.colors.text.primary }]}>
          {item.name}
        </Text>
        {item.description && (
          <Text style={[styles.categoryDescription, { color: theme.colors.text.secondary }]}>
            {item.description}
          </Text>
        )}
      </View>
      {selectedCategory === item.id && (
        <View style={[styles.checkmark, { backgroundColor: theme.colors.primary.main }]}>
          <MaterialCommunityIcons name="check" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  // Kategorileri tek sütun olarak düzenle
  const renderCategoriesInRows = () => {
    return serviceCategories.map((item) => (
      <View key={item.id} style={styles.categoryRow}>
        {renderCategoryItem({ item })}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Hizmet Kategorisi Seçin
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        Arızanızın hangi kategoriye ait olduğunu seçin
      </Text>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      >
        {renderCategoriesInRows()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  categoryRow: {
    width: '100%',
  },
  categoryItem: {
    flexDirection: 'row',
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 80,
  },
  categoryItemSelected: {
    borderWidth: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryContent: {
    flex: 1,
    marginLeft: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
