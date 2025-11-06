import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/theme/theme';

interface SearchFiltersProps {
  selectedFilters: string[];
  sortBy: 'rating' | 'experience' | 'jobs' | 'distance';
  onFiltersChange: (filters: string[]) => void;
  onSortChange: (sortBy: 'rating' | 'experience' | 'jobs' | 'distance') => void;
  onClose: () => void;
}

const FILTER_OPTIONS = [
  { id: 'available', label: 'Müsait Ustalar', icon: 'checkmark-circle' },
  { id: 'high_rating', label: 'Yüksek Puanlı (4.0+)', icon: 'star' },
  { id: 'experienced', label: 'Deneyimli (5+ yıl)', icon: 'trophy' },
  { id: 'verified', label: 'Doğrulanmış', icon: 'shield-checkmark' },
];

const SORT_OPTIONS = [
  { id: 'rating', label: 'Puana Göre', icon: 'star' },
  { id: 'experience', label: 'Deneyime Göre', icon: 'trophy' },
  { id: 'jobs', label: 'İş Sayısına Göre', icon: 'briefcase' },
  { id: 'distance', label: 'Mesafeye Göre', icon: 'location' },
];

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  selectedFilters,
  sortBy,
  onFiltersChange,
  onSortChange,
  onClose,
}) => {
  const { theme, isDark } = useTheme();

  const toggleFilter = (filterId: string) => {
    if (selectedFilters.includes(filterId)) {
      onFiltersChange(selectedFilters.filter((f) => f !== filterId));
    } else {
      onFiltersChange([...selectedFilters, filterId]);
    }
  };

  const clearFilters = () => {
    onFiltersChange([]);
    onSortChange('rating');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? theme.colors.background.secondary : '#FFFFFF',
          borderBottomColor: theme.colors.border.light,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Filtreler ve Sıralama
        </Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sort Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            Sıralama
          </Text>
          <View style={styles.optionsContainer}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sortOption,
                  {
                    backgroundColor:
                      sortBy === option.id
                        ? theme.colors.primary.main
                        : isDark
                        ? theme.colors.background.tertiary
                        : theme.colors.background.secondary,
                    borderColor:
                      sortBy === option.id ? theme.colors.primary.main : theme.colors.border.light,
                  },
                ]}
                onPress={() => onSortChange(option.id as any)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={18}
                  color={sortBy === option.id ? '#FFFFFF' : theme.colors.text.primary}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    {
                      color: sortBy === option.id ? '#FFFFFF' : theme.colors.text.primary,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filter Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            Filtreler
          </Text>
          <View style={styles.optionsContainer}>
            {FILTER_OPTIONS.map((option) => {
              const isSelected = selectedFilters.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primary.ultraLight
                        : isDark
                        ? theme.colors.background.tertiary
                        : theme.colors.background.secondary,
                      borderColor: isSelected
                        ? theme.colors.primary.main
                        : theme.colors.border.light,
                    },
                  ]}
                  onPress={() => toggleFilter(option.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary.main
                          : 'transparent',
                        borderColor: isSelected
                          ? theme.colors.primary.main
                          : theme.colors.border.medium,
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={isSelected ? theme.colors.primary.main : theme.colors.text.secondary}
                    style={styles.filterIcon}
                  />
                  <Text
                    style={[
                      styles.filterOptionText,
                      {
                        color: isSelected
                          ? theme.colors.primary.main
                          : theme.colors.text.primary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Clear Filters Button */}
        {(selectedFilters.length > 0 || sortBy !== 'rating') && (
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: theme.colors.border.medium }]}
            onPress={clearFilters}
          >
            <Ionicons name="close-circle" size={18} color={theme.colors.error.main} />
            <Text style={[styles.clearButtonText, { color: theme.colors.error.main }]}>
              Filtreleri Temizle
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.xs,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: {
    marginLeft: spacing.xs,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

